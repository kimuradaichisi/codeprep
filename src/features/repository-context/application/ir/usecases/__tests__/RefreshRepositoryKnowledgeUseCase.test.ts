import { describe, expect, it } from 'vitest';
import {
  buildEdgeId,
  buildFileNodeId,
  createEvidence,
  createRepositoryEdge,
  createRepositoryIR,
  createRepositoryNode,
  createRepositorySnapshot,
  type RepositoryEdge,
  type RepositoryNode,
  type RepositorySnapshot,
} from '../../../../domain/ir';
import { SqliteRepositoryKnowledgeStore } from '../../../../infrastructure/knowledge/sqlite/SqliteRepositoryKnowledgeStore';
import type { RepositoryChangeSet, RepositoryRevisionPort } from '../../ports/RepositoryRevisionPort';
import {
  RefreshRepositoryKnowledgeUseCase,
  type IncrementalProducerExecutionInput,
  type IncrementalProducerExecutionResult,
} from '../RefreshRepositoryKnowledgeUseCase';

function createFileNode(snapshot: RepositorySnapshot, relativePath: string): RepositoryNode {
  return createRepositoryNode({
    id: buildFileNodeId(snapshot.snapshotId, relativePath),
    snapshotId: snapshot.snapshotId,
    kind: 'file',
    name: relativePath.split('/').pop() ?? relativePath,
    path: relativePath,
  });
}

function createReferenceEdge(snapshot: RepositorySnapshot, srcNode: RepositoryNode, tgtNode: RepositoryNode): RepositoryEdge {
  const id = buildEdgeId(snapshot.snapshotId, srcNode.id, 'references', tgtNode.id);
  return createRepositoryEdge({
    id, snapshotId: snapshot.snapshotId, sourceNodeId: srcNode.id, targetNodeId: tgtNode.id,
    relationType: 'references', isDerived: false, confidence: 1.0,
    evidences: [createEvidence({ id: `ev:${id}`, category: 'deterministic-ast', analyzer: 'typescript-language-adapter', confidence: 1.0, sourcePath: srcNode.path })],
  });
}

describe('RefreshRepositoryKnowledgeUseCase Scenarios & Correctness Oracle', () => {
  const workspaceRoot = '/test-workspace';

  it('handles Scenario A: No Change (NO_OP fast path)', async () => {
    const store = new SqliteRepositoryKnowledgeStore({ workspaceRoot, dbPath: ':memory:' });
    const snapA = createRepositorySnapshot({ snapshotId: 'snap-1', repositoryId: 'repo', workspaceRoot, revision: 'rev-1', createdAt: new Date().toISOString() });
    const nodeA = createFileNode(snapA, 'src/main.ts');
    await store.save(createRepositoryIR({ snapshot: snapA, nodes: [nodeA], edges: [] }));

    const revisionPort: RepositoryRevisionPort = {
      currentRevision: async () => 'rev-1',
      diff: async () => ({ fromRevision: 'rev-1', toRevision: 'rev-1', added: [], modified: [], deleted: [], renamed: [], allChangedPaths: [] }),
      isWorkingTreeClean: async () => true,
    };

    const useCase = new RefreshRepositoryKnowledgeUseCase();
    const result = await useCase.execute({
      repositoryId: 'repo', workspaceRoot, previousSnapshotId: 'snap-1', store, revisionPort,
      executeProducers: async () => ({ addedNodes: [], addedEdges: [] }),
    });

    expect(result.status).toBe('NO_OP');
    expect(result.metrics?.status).toBe('NO_OP');
    expect(result.metrics?.changedFiles).toBe(0);
    await store.close();
  });

  it('rejects refresh when working tree is dirty', async () => {
    const store = new SqliteRepositoryKnowledgeStore({ workspaceRoot, dbPath: ':memory:' });
    const revisionPort: RepositoryRevisionPort = {
      currentRevision: async () => 'rev-2',
      diff: async () => ({} as RepositoryChangeSet),
      isWorkingTreeClean: async () => false,
    };

    const useCase = new RefreshRepositoryKnowledgeUseCase();
    const result = await useCase.execute({
      repositoryId: 'repo', workspaceRoot, previousSnapshotId: 'snap-1', store, revisionPort,
      executeProducers: async () => ({ addedNodes: [], addedEdges: [] }),
    });

    expect(result.status).toBe('DIRTY_WORKTREE');
    await store.close();
  });

  it('handles Scenarios B (Add), C (Modify), D (Delete), E (Rename) with Full Rebuild Oracle Match', async () => {
    const store = new SqliteRepositoryKnowledgeStore({ workspaceRoot, dbPath: ':memory:' });

    // Initial State (Revision 1): main.ts, util.ts, old.ts. main references util, main references old
    const snap1 = createRepositorySnapshot({ snapshotId: 'snap-1', repositoryId: 'repo', workspaceRoot, revision: 'rev-1', createdAt: new Date().toISOString() });
    const nMain1 = createFileNode(snap1, 'src/main.ts');
    const nUtil1 = createFileNode(snap1, 'src/util.ts');
    const nOld1 = createFileNode(snap1, 'src/old.ts');
    const eMainUtil1 = createReferenceEdge(snap1, nMain1, nUtil1);
    const eMainOld1 = createReferenceEdge(snap1, nMain1, nOld1);
    await store.save(createRepositoryIR({ snapshot: snap1, nodes: [nMain1, nUtil1, nOld1], edges: [eMainUtil1, eMainOld1] }));

    // Target State (Revision 2):
    // - old.ts deleted
    // - helper.ts added
    // - util.ts modified
    // - main.ts updated references: main -> util, main -> helper
    const changeSet: RepositoryChangeSet = {
      fromRevision: 'rev-1', toRevision: 'rev-2',
      added: ['src/helper.ts'],
      modified: ['src/util.ts'],
      deleted: ['src/old.ts'],
      renamed: [],
      allChangedPaths: ['src/helper.ts', 'src/util.ts', 'src/old.ts'],
    };

    const revisionPort: RepositoryRevisionPort = {
      currentRevision: async () => 'rev-2',
      diff: async () => changeSet,
      isWorkingTreeClean: async () => true,
    };

    const executeProducers = async (input: IncrementalProducerExecutionInput): Promise<IncrementalProducerExecutionResult> => {
      const snap = input.newSnapshot;
      const nHelper = createFileNode(snap, 'src/helper.ts');
      const nMain = createFileNode(snap, 'src/main.ts');
      const nUtil = createFileNode(snap, 'src/util.ts');
      // main is in dependent closure because util was modified!
      const eMainUtil = createReferenceEdge(snap, nMain, nUtil);
      const eMainHelper = createReferenceEdge(snap, nMain, nHelper);
      return { addedNodes: [nHelper, nUtil], addedEdges: [eMainUtil, eMainHelper] };
    };

    const useCase = new RefreshRepositoryKnowledgeUseCase();
    const result = await useCase.execute({
      repositoryId: 'repo', workspaceRoot, previousSnapshotId: 'snap-1', targetRevision: 'rev-2', store, revisionPort, executeProducers,
    });

    expect(result.status).toBe('REFRESHED');
    expect(result.ir).toBeDefined();
    const incrementalIR = result.ir!;

    // Assert Scenario D (Delete): old.ts and its edges are completely gone (0 dangling)
    const paths = Array.from(incrementalIR.nodes.values()).map(n => n.path);
    expect(paths).not.toContain('src/old.ts');
    expect(paths).toContain('src/helper.ts');
    expect(paths).toContain('src/main.ts');
    expect(paths).toContain('src/util.ts');
    expect(incrementalIR.nodes.size).toBe(3);

    // --- Correctness Oracle: Compare with identical Full Rebuild from scratch ---
    const snapOracle = createRepositorySnapshot({ snapshotId: 'snap-oracle', repositoryId: 'repo', workspaceRoot, revision: 'rev-2', createdAt: new Date().toISOString() });
    const oMain = createFileNode(snapOracle, 'src/main.ts');
    const oUtil = createFileNode(snapOracle, 'src/util.ts');
    const oHelper = createFileNode(snapOracle, 'src/helper.ts');
    const oMainUtil = createReferenceEdge(snapOracle, oMain, oUtil);
    const oMainHelper = createReferenceEdge(snapOracle, oMain, oHelper);
    const oracleIR = createRepositoryIR({ snapshot: snapOracle, nodes: [oMain, oUtil, oHelper], edges: [oMainUtil, oMainHelper] });

    // Normalize and compare
    const normIncNodes = Array.from(incrementalIR.nodes.values()).map(n => ({ path: n.path, kind: n.kind })).sort((a, b) => a.path.localeCompare(b.path));
    const normOraNodes = Array.from(oracleIR.nodes.values()).map(n => ({ path: n.path, kind: n.kind })).sort((a, b) => a.path.localeCompare(b.path));
    expect(normIncNodes).toEqual(normOraNodes);

    expect(incrementalIR.edges.length).toBe(oracleIR.edges.length);
    const incRels = incrementalIR.edges.map(e => e.relationType).sort();
    const oraRels = oracleIR.edges.map(e => e.relationType).sort();
    expect(incRels).toEqual(oraRels);

    await store.close();
  });

  it('handles Scenario E: Rename (old path removed, new path added, 0 stale facts)', async () => {
    const store = new SqliteRepositoryKnowledgeStore({ workspaceRoot, dbPath: ':memory:' });
    const snap1 = createRepositorySnapshot({ snapshotId: 'snap-1', repositoryId: 'repo', workspaceRoot, revision: 'rev-1', createdAt: new Date().toISOString() });
    const nLegacy = createFileNode(snap1, 'src/legacy.ts');
    await store.save(createRepositoryIR({ snapshot: snap1, nodes: [nLegacy], edges: [] }));

    const changeSet: RepositoryChangeSet = {
      fromRevision: 'rev-1', toRevision: 'rev-2',
      added: [], modified: [], deleted: [],
      renamed: [{ oldPath: 'src/legacy.ts', newPath: 'src/modern.ts' }],
      allChangedPaths: ['src/legacy.ts', 'src/modern.ts'],
    };

    const revisionPort: RepositoryRevisionPort = {
      currentRevision: async () => 'rev-2',
      diff: async () => changeSet,
      isWorkingTreeClean: async () => true,
    };

    const useCase = new RefreshRepositoryKnowledgeUseCase();
    const result = await useCase.execute({
      repositoryId: 'repo', workspaceRoot, previousSnapshotId: 'snap-1', targetRevision: 'rev-2', store, revisionPort,
      executeProducers: async (input) => ({
        addedNodes: [createFileNode(input.newSnapshot, 'src/modern.ts')],
        addedEdges: [],
      }),
    });

    expect(result.status).toBe('REFRESHED');
    const paths = Array.from(result.ir!.nodes.values()).map(n => n.path);
    expect(paths).not.toContain('src/legacy.ts');
    expect(paths).toContain('src/modern.ts');
    expect(result.ir!.nodes.size).toBe(1);
    await store.close();
  });
});

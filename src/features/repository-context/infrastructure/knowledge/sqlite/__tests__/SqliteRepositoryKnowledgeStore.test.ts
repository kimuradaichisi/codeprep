import { describe, expect, it } from 'vitest';
import {
  createEvidence,
  createRepositoryEdge,
  createRepositoryIR,
  createRepositoryNode,
  createRepositorySnapshot,
} from '../../../../domain/ir';
import { SqliteRepositoryKnowledgeStore } from '../SqliteRepositoryKnowledgeStore';

describe('SqliteRepositoryKnowledgeStore', () => {
  const createTestIR = (snapshotId = 'snap-1', repoId = 'repo-1') => {
    const snapshot = createRepositorySnapshot({
      snapshotId,
      repositoryId: repoId,
      revision: 'commit-abc-123',
      workspaceRoot: '/workspace/test',
      createdAt: '2026-09-13T10:00:00Z',
      metadata: { testMeta: 'value1' },
    });

    const node1 = createRepositoryNode({
      id: 'node:snap-1:file:src/port.ts',
      snapshotId,
      kind: 'file',
      name: 'port.ts',
      path: 'src/port.ts',
      language: 'typescript',
    });

    const node2 = createRepositoryNode({
      id: 'node:snap-1:file:src/impl.ts',
      snapshotId,
      kind: 'file',
      name: 'impl.ts',
      path: 'src/impl.ts',
      language: 'typescript',
    });

    const edge = createRepositoryEdge({
      id: 'edge:snap-1:binds',
      snapshotId,
      sourceNodeId: node1.id,
      targetNodeId: node2.id,
      relationType: 'binds_to',
      isDerived: false,
      confidence: 1.0,
      evidences: [
        createEvidence({
          id: 'ev:1',
          category: 'deterministic-ast',
          analyzer: 'test-analyzer',
          confidence: 1.0,
          sourcePath: 'src/comp.ts',
          sourceLocation: { startLine: 10, endLine: 12 },
          details: { param: 'port' },
        }),
      ],
    });

    return createRepositoryIR({ snapshot, nodes: [node1, node2], edges: [edge] });
  };

  it('performs full round-trip save and load without losing fidelity', async () => {
    const store = new SqliteRepositoryKnowledgeStore({
      workspaceRoot: '/workspace/test',
      dbPath: ':memory:',
    });

    const originalIR = createTestIR();
    await store.save(originalIR);

    const loadedIR = await store.load('snap-1');
    expect(loadedIR).not.toBeNull();
    expect(loadedIR?.snapshot.snapshotId).toBe(originalIR.snapshot.snapshotId);
    expect(loadedIR?.snapshot.revision).toBe(originalIR.snapshot.revision);
    expect(loadedIR?.snapshot.metadata).toEqual(originalIR.snapshot.metadata);

    expect(loadedIR?.nodes.size).toBe(2);
    const loadedNode1 = loadedIR?.nodes.get('node:snap-1:file:src/port.ts');
    expect(loadedNode1).toBeDefined();
    expect(loadedNode1?.name).toBe('port.ts');

    expect(loadedIR?.edges).toHaveLength(1);
    const loadedEdge = loadedIR!.edges[0];
    expect(loadedEdge.id).toBe(originalIR.edges[0].id);
    expect(loadedEdge.relationType).toBe('binds_to');
    expect(loadedEdge.evidences).toHaveLength(1);
    expect(loadedEdge.evidences[0].id).toBe('ev:1');
    expect(loadedEdge.evidences[0].details).toEqual({ param: 'port' });

    await store.close();
  });

  it('queries neighbors correctly', async () => {
    const store = new SqliteRepositoryKnowledgeStore({
      workspaceRoot: '/workspace/test',
      dbPath: ':memory:',
    });

    await store.save(createTestIR());

    const result = await store.queryNeighbors({
      snapshotId: 'snap-1',
      nodeId: 'node:snap-1:file:src/port.ts',
      direction: 'outgoing',
    });

    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].relationType).toBe('binds_to');
    expect(result.targetNodes).toHaveLength(1);
    expect(result.targetNodes[0].path).toBe('src/impl.ts');

    await store.close();
  });

  it('deletes snapshot cleanly', async () => {
    const store = new SqliteRepositoryKnowledgeStore({
      workspaceRoot: '/workspace/test',
      dbPath: ':memory:',
    });

    await store.save(createTestIR());
    expect(await store.load('snap-1')).not.toBeNull();

    await store.deleteSnapshot('snap-1');
    expect(await store.load('snap-1')).toBeNull();

    const stats = await store.getStatistics('snap-1');
    expect(stats.nodeCount).toBe(0);
    expect(stats.edgeCount).toBe(0);

    await store.close();
  });

  it('rolls back completely if an error occurs during save', async () => {
    const store = new SqliteRepositoryKnowledgeStore({
      workspaceRoot: '/workspace/test',
      dbPath: ':memory:',
    });

    // Valid initial save
    await store.save(createTestIR('snap-initial'));
    expect(await store.load('snap-initial')).not.toBeNull();

    const validIR = createTestIR('snap-broken');
    // Mock the driver to throw during edge save
    const failingDriver = (store as unknown as { driver: import('../SqliteDriver').SqliteDriver }).driver;
    const origPrepare = failingDriver.prepare.bind(failingDriver);
    failingDriver.prepare = (sql: string) => {
      if (sql.includes('repository_edges')) {
        throw new Error('Simulated disk/SQL failure during edge persistence');
      }
      return origPrepare(sql);
    };

    await expect(store.save(validIR)).rejects.toThrow('Simulated disk/SQL failure');

    // Restore prepare
    failingDriver.prepare = origPrepare;

    // Verify nothing from snap-broken was committed
    const loadedBroken = await store.load('snap-broken');
    expect(loadedBroken).toBeNull();
    const stats = await store.getStatistics('snap-broken');
    expect(stats.nodeCount).toBe(0);
    expect(stats.edgeCount).toBe(0);

    // Verify snap-initial is still intact
    const loadedInitial = await store.load('snap-initial');
    expect(loadedInitial).not.toBeNull();

    await store.close();
  });

  it('finds nodes by path, kind, or query term', async () => {
    const store = new SqliteRepositoryKnowledgeStore({ workspaceRoot: '/workspace/test', dbPath: ':memory:' });
    await store.save(createTestIR('snap-search'));

    const byPath = await store.findNodes({ snapshotId: 'snap-search', path: 'src/port.ts' });
    expect(byPath.length).toBeGreaterThan(0);
    expect(byPath[0].path).toBe('src/port.ts');

    const byQuery = await store.findNodes({ snapshotId: 'snap-search', query: 'port' });
    expect(byQuery.length).toBeGreaterThan(0);

    const byKind = await store.findNodes({ snapshotId: 'snap-search', kinds: ['file'] });
    expect(byKind.every(n => n.kind === 'file')).toBe(true);

    await store.close();
  });
});

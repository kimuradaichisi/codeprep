import { describe, expect, it } from 'vitest';
import {
  buildFileNodeId,
  createEvidence,
  createRepositoryEdge,
  createRepositoryNode,
  createRepositoryIR,
  createRepositorySnapshot,
  type RepositoryNode,
  type RepositorySnapshot,
} from '../../../../domain/ir';
import { isCompilerConfigChange, resolveDependentClosure } from '../ImpactResolver';
import { RefreshPlanner } from '../RefreshPlanner';
import { IRInvalidator } from '../IRInvalidator';

function createFileNode(snapshot: RepositorySnapshot, relativePath: string): RepositoryNode {
  return createRepositoryNode({
    id: buildFileNodeId(snapshot.snapshotId, relativePath),
    snapshotId: snapshot.snapshotId,
    kind: 'file',
    name: relativePath.split('/').pop() ?? relativePath,
    path: relativePath,
  });
}

describe('ImpactResolver', () => {
  const snapshot = createRepositorySnapshot({
    snapshotId: 's1', repositoryId: 'repo', workspaceRoot: '/root', revision: 'r1', createdAt: new Date().toISOString(),
  });

  const nodeA = createFileNode(snapshot, 'src/a.ts');
  const nodeB = createFileNode(snapshot, 'src/b.ts');
  const nodeC = createFileNode(snapshot, 'src/c.ts');

  // B depends-on A (B references A)
  const edgeBA = createRepositoryEdge({
    id: 'e1', snapshotId: 's1', sourceNodeId: nodeB.id, targetNodeId: nodeA.id,
    relationType: 'references', isDerived: false, confidence: 1.0,
    evidences: [createEvidence({ id: 'ev1', category: 'deterministic-ast', analyzer: 'typescript-language-adapter', confidence: 1.0, sourcePath: 'src/b.ts' })],
  });

  const ir = createRepositoryIR({
    snapshot,
    nodes: [nodeA, nodeB, nodeC],
    edges: [edgeBA],
  });

  it('identifies compiler config changes', () => {
    expect(isCompilerConfigChange(['src/main.ts', 'tsconfig.json'])).toBe(true);
    expect(isCompilerConfigChange(['src/main.ts', 'src/util.ts'])).toBe(false);
  });

  it('resolves 1-hop dependent closure from graph', () => {
    // If A is changed, B should be included because B has incoming reference to A
    const res = resolveDependentClosure(['src/a.ts'], ir);
    expect(res.isFullFallback).toBe(false);
    expect(res.paths).toContain('src/a.ts');
    expect(res.paths).toContain('src/b.ts');
    expect(res.paths).not.toContain('src/c.ts');
  });

  it('falls back to full rebuild when tsconfig is modified', () => {
    const res = resolveDependentClosure(['tsconfig.json'], ir);
    expect(res.isFullFallback).toBe(true);
  });
});

describe('RefreshPlanner & IRInvalidator', () => {
  const snapshot = createRepositorySnapshot({
    snapshotId: 's1', repositoryId: 'repo', workspaceRoot: '/root', revision: 'r1', createdAt: new Date().toISOString(),
  });

  const nodeA = createFileNode(snapshot, 'src/a.ts');
  const nodeB = createFileNode(snapshot, 'src/b.ts');
  const edgeBA = createRepositoryEdge({
    id: 'e1', snapshotId: 's1', sourceNodeId: nodeB.id, targetNodeId: nodeA.id,
    relationType: 'references', isDerived: false, confidence: 1.0,
    evidences: [createEvidence({ id: 'ev1', category: 'deterministic-ast', analyzer: 'typescript-language-adapter', confidence: 1.0, sourcePath: 'src/b.ts' })],
  });

  const ir = createRepositoryIR({
    snapshot,
    nodes: [nodeA, nodeB],
    edges: [edgeBA],
  });

  it('plans incremental refresh and invalidates deleted facts', () => {
    const planner = new RefreshPlanner();
    const plan = planner.plan({
      repositoryId: 'repo',
      previousSnapshotId: 's1',
      previousRevision: 'r1',
      targetRevision: 'r2',
      changeSet: {
        fromRevision: 'r1', toRevision: 'r2',
        added: [], modified: [], deleted: ['src/a.ts'], renamed: [],
        allChangedPaths: ['src/a.ts'],
      },
      previousIR: ir,
    });

    expect(plan.producerPlans.length).toBeGreaterThan(0);

    const invalidator = new IRInvalidator();
    const result = invalidator.invalidate(ir, plan);

    expect(result.removedNodeCount).toBe(1); // nodeA deleted
    expect(result.retainedNodes.length).toBe(1); // only nodeB remains
    expect(result.removedEdgeCount).toBe(1); // edgeBA dropped because nodeA target is gone
    expect(result.retainedEdges.length).toBe(0);
  });
});

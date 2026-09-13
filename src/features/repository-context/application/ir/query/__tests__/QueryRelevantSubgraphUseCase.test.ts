import { describe, expect, it } from 'vitest';
import {
  createEvidence,
  createRepositoryEdge,
  createRepositoryIR,
  createRepositoryNode,
  createRepositorySnapshot,
} from '../../../../domain/ir';
import { SqliteRepositoryKnowledgeStore } from '../../../../infrastructure/knowledge/sqlite/SqliteRepositoryKnowledgeStore';
import { QueryRelevantSubgraphUseCase } from '../QueryRelevantSubgraphUseCase';

function createSampleIR(snapshotId: string) {
  const snapshot = createRepositorySnapshot({
    snapshotId, repositoryId: 'test-repo', workspaceRoot: '/workspace/test',
    revision: 'head-1', createdAt: new Date().toISOString(),
  });

  const nodeRoot = createRepositoryNode({
    id: `node:${snapshotId}:file:src/controller.ts`, snapshotId, kind: 'file',
    name: 'controller.ts', path: 'src/controller.ts', language: 'typescript',
  });

  const nodeService = createRepositoryNode({
    id: `node:${snapshotId}:file:src/service.ts`, snapshotId, kind: 'file',
    name: 'service.ts', path: 'src/service.ts', language: 'typescript',
  });

  const nodeHelper = createRepositoryNode({
    id: `node:${snapshotId}:file:src/helper.ts`, snapshotId, kind: 'file',
    name: 'helper.ts', path: 'src/helper.ts', language: 'typescript',
  });

  const edgeInjects = createRepositoryEdge({
    id: `edge:${snapshotId}:injects`, snapshotId,
    sourceNodeId: nodeRoot.id, targetNodeId: nodeService.id,
    relationType: 'injects', isDerived: false, confidence: 1.0,
    evidences: [createEvidence({
      id: 'ev:1', category: 'deterministic-ast', analyzer: 'typescript-manual-composition',
      confidence: 1.0, sourcePath: 'src/controller.ts',
    })],
  });

  const edgeCoChange = createRepositoryEdge({
    id: `edge:${snapshotId}:cochange`, snapshotId,
    sourceNodeId: nodeService.id, targetNodeId: nodeHelper.id,
    relationType: 'co-changed-with', isDerived: true, confidence: 0.5,
    evidences: [createEvidence({
      id: 'ev:2', category: 'git-history', analyzer: 'git-cochange',
      confidence: 0.5, sourcePath: 'src/service.ts',
    })],
  });

  return createRepositoryIR({
    snapshot,
    nodes: [nodeRoot, nodeService, nodeHelper],
    edges: [edgeInjects, edgeCoChange],
  });
}

describe('QueryRelevantSubgraphUseCase', () => {
  it('discovers seeds, traverses graph with bounded hops, and generates explainable rankings', async () => {
    const store = new SqliteRepositoryKnowledgeStore({ workspaceRoot: '/workspace/test', dbPath: ':memory:' });
    const snapId = 'snap-query-test';
    await store.save(createSampleIR(snapId));

    const useCase = new QueryRelevantSubgraphUseCase(store);
    const result = await useCase.execute({
      task: 'Fix issue in controller and service',
      snapshotId: snapId,
      maxSeeds: 5,
      maxNodes: 10,
      maxHops: 2,
    });

    expect(result.seeds.length).toBeGreaterThan(0);
    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.rankedNodes.length).toBeGreaterThan(0);

    const topNode = result.rankedNodes[0];
    expect(topNode.score).toBeGreaterThan(0);
    expect(topNode.reasons.length).toBeGreaterThan(0);
    expect(topNode.supportingPaths.length).toBeGreaterThan(0);

    // Verify explanation trace
    const topExp = result.explanations.find(e => e.nodeId === topNode.nodeId);
    expect(topExp).toBeDefined();
    expect(topExp!.finalScore).toBe(topNode.score);

    await store.close();
  });

  it('honors optionalExplicitPaths as the strongest seeds and bounds traversal around them', async () => {
    const store = new SqliteRepositoryKnowledgeStore({ workspaceRoot: '/workspace/test', dbPath: ':memory:' });
    const snapId = 'snap-explicit-test';
    await store.save(createSampleIR(snapId));

    const useCase = new QueryRelevantSubgraphUseCase(store);
    const result = await useCase.execute({
      task: 'Some generic task text',
      snapshotId: snapId,
      optionalExplicitPaths: ['src/controller.ts'],
      maxSeeds: 1,
      maxNodes: 5,
      maxHops: 1,
    });

    expect(result.seeds.length).toBe(1);
    expect(result.seeds[0].path).toBe('src/controller.ts');
    expect(result.seeds[0].matchType).toBe('explicit-path');
    expect(result.seeds[0].score).toBe(1.0);

    // With maxHops: 1, should reach nodeService via injects, but not helper via co-change (hop 2)
    const nodePaths = result.nodes.map(n => n.path);
    expect(nodePaths).toContain('src/controller.ts');
    expect(nodePaths).toContain('src/service.ts');
    expect(nodePaths).not.toContain('src/helper.ts');

    await store.close();
  });
});

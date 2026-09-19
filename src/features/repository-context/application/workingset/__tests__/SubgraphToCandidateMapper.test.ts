// src/features/repository-context/application/workingset/__tests__/SubgraphToCandidateMapper.test.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect } from 'vitest';
import { SubgraphToCandidateMapper } from '../SubgraphToCandidateMapper';
import type { RepositoryRelevantSubgraph } from '../../ir/query/TaskQueryDto';

describe('SubgraphToCandidateMapper', () => {
  it('maps ranked nodes to working set candidates with roles and tiers', () => {
    const subgraph: RepositoryRelevantSubgraph = {
      query: { task: 'test', snapshotId: 's1' },
      seeds: [
        { nodeId: 'node:1', path: 'src/Service.ts', score: 1.0, matchType: 'symbol-name', matchedText: 'Service' },
      ],
      nodes: [],
      edges: [
        {
          id: 'e1',
          snapshotId: 's1',
          sourceNodeId: 'node:1',
          targetNodeId: 'node:2',
          relationType: 'DEPENDS_ON',
          confidence: 0.9,
          isDerived: false,
          evidences: [],
        },
      ],
      rankedNodes: [
        {
          nodeId: 'node:1',
          path: 'src/Service.ts',
          name: 'Service',
          kind: 'class',
          score: 0.95,
          reasons: ['seed: symbol-name'],
          supportingPaths: [],
        },
        {
          nodeId: 'node:2',
          path: 'src/Dep.ts',
          name: 'Dep',
          kind: 'class',
          score: 0.7,
          reasons: ['relation: DEPENDS_ON'],
          supportingPaths: ['src/Service.ts'],
        },
      ],
      explanations: [],
      metrics: {
        seedCount: 1,
        expandedNodes: 2,
        queriedEdges: 1,
        durationMs: 10,
        sqliteQueryCount: 1,
        maxHopsReached: 1,
        relationDistribution: {},
        noiseFilteredCounts: {},
        consideredRelationCounts: {},
      },
    };

    const candidates = SubgraphToCandidateMapper.map(subgraph);
    expect(candidates.length).toBe(2);
    expect(candidates[0].nodeId).toBe('node:1');
    expect(candidates[0].role).toBe('target');
    expect(candidates[0].tier).toBe('core');
    expect(candidates[0].priority).toBe(2);

    expect(candidates[1].nodeId).toBe('node:2');
    expect(candidates[1].role).toBe('dependency');
    expect(candidates[1].tier).toBe('supporting');
    expect(candidates[1].priority).toBe(3);
  });
});

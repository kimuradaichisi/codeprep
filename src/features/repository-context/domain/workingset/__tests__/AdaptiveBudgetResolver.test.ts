// src/features/repository-context/domain/workingset/__tests__/AdaptiveBudgetResolver.test.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect } from 'vitest';
import { AdaptiveBudgetResolver } from '../AdaptiveBudgetResolver';
import type { RepositoryRelationType, RepositoryEdge } from '../../../domain/ir';
import type { RepositoryRelevantSubgraph } from '../../../application/ir/query/TaskQueryDto';

function createMockEdge(sourceNodeId: string, targetNodeId: string, relationType: RepositoryRelationType = 'references'): RepositoryEdge {
  return {
    id: `${sourceNodeId}->${targetNodeId}`,
    snapshotId: 'snap1',
    sourceNodeId,
    targetNodeId,
    relationType,
    isDerived: false,
    evidences: [],
    confidence: 1.0,
  };
}

function createMockSubgraph(overrides?: Partial<RepositoryRelevantSubgraph>): RepositoryRelevantSubgraph {
  return {
    query: {
      task: 'Fix A',
      snapshotId: 'snap1',
    },
    seeds: [
      { nodeId: 'n1', path: 'src/A.ts', score: 0.95, matchType: 'symbol-name', matchedText: 'A' },
    ],
    nodes: [],
    rankedNodes: [
      { nodeId: 'n1', path: 'src/A.ts', name: 'A', kind: 'symbol', score: 0.95, reasons: ['seed'], supportingPaths: [] },
      { nodeId: 'n2', path: 'src/B.ts', name: 'B', kind: 'file', score: 0.7, reasons: ['ref'], supportingPaths: [] },
    ],
    explanations: [],
    edges: [
      createMockEdge('n1', 'n2', 'references'),
    ],
    metrics: {
      durationMs: 10,
      expandedNodes: 2,
      queriedEdges: 1,
      seedCount: 1,
      sqliteQueryCount: 2,
      maxHopsReached: 1,
      relationDistribution: {},
      noiseFilteredCounts: {},
      consideredRelationCounts: {},
    },
    ...overrides,
  };
}

describe('TaskScopeClassifier & AdaptiveBudgetResolver', () => {
  it('classifies as narrow when explicit paths are provided', () => {
    const sub = createMockSubgraph();
    const decision = AdaptiveBudgetResolver.resolve({
      task: 'Fix A',
      subgraph: sub,
      explicitPaths: ['src/A.ts'],
    });

    expect(decision.scope).toBe('narrow');
    expect(decision.source).toBe('adaptive');
    expect(decision.budget.maxFiles).toBe(5);
    expect(decision.recallReserveLimit).toBe(1);
    expect(decision.reasons).toContain('Explicit paths provided; focused scope');
  });

  it('classifies as narrow when single strong seed and high score gap', () => {
    const sub = createMockSubgraph({
      rankedNodes: [
        { nodeId: 'n1', path: 'src/A.ts', name: 'A', kind: 'symbol', score: 0.95, reasons: ['seed'], supportingPaths: [] },
        { nodeId: 'n2', path: 'src/B.ts', name: 'B', kind: 'file', score: 0.6, reasons: ['ref'], supportingPaths: [] },
      ],
    });
    const decision = AdaptiveBudgetResolver.resolve({
      task: 'Fix single symbol in A',
      subgraph: sub,
    });

    expect(decision.scope).toBe('narrow');
    expect(decision.budget.maxFiles).toBe(5);
  });

  it('classifies as broad when many seeds and dispersed relations in large subgraph', () => {
    const seeds = [
      { nodeId: 'n1', path: 'src/feat1/A.ts', score: 0.8, matchType: 'symbol-name' as const, matchedText: 'A' },
      { nodeId: 'n2', path: 'src/feat2/B.ts', score: 0.79, matchType: 'symbol-name' as const, matchedText: 'B' },
      { nodeId: 'n3', path: 'src/feat3/C.ts', score: 0.78, matchType: 'symbol-name' as const, matchedText: 'C' },
      { nodeId: 'n4', path: 'src/feat4/D.ts', score: 0.77, matchType: 'symbol-name' as const, matchedText: 'D' },
    ];
    const rankedNodes = Array.from({ length: 26 }, (_, i) => ({
      nodeId: `n${i}`,
      path: `src/feat${i % 5}/File${i}.ts`,
      name: `Sym${i}`,
      kind: 'symbol',
      score: 0.8 - i * 0.005,
      reasons: ['mock'],
      supportingPaths: [],
    }));
    const edges = [
      createMockEdge('n1', 'n2', 'references'),
      createMockEdge('n1', 'n3', 'depends-on'),
      createMockEdge('n2', 'n4', 'injects'),
      createMockEdge('n3', 'n5', 'doc-relation'),
    ];

    const sub = createMockSubgraph({ seeds, rankedNodes, edges });
    const decision = AdaptiveBudgetResolver.resolve({
      task: 'Cross layer feature update',
      subgraph: sub,
    });

    expect(decision.scope).toBe('broad');
    expect(decision.budget.maxFiles).toBe(12);
    expect(decision.recallReserveLimit).toBe(3);
  });

  it('respects explicit user budget override', () => {
    const sub = createMockSubgraph();
    const explicitBudget = {
      maxFiles: 3,
      maxNodes: 6,
      maxEstimatedTokens: 4000,
      maxBytes: 16 * 1024,
    };

    const decision = AdaptiveBudgetResolver.resolve({
      task: 'Fix A',
      subgraph: sub,
      userBudget: explicitBudget,
    });

    expect(decision.source).toBe('explicit');
    expect(decision.budget.maxFiles).toBe(3);
    expect(decision.budget.maxEstimatedTokens).toBe(4000);
    expect(decision.reasons[0]).toContain('Explicit user budget override provided');
  });
});

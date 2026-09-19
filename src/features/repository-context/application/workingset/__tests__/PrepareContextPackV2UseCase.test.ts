// src/features/repository-context/application/workingset/__tests__/PrepareContextPackV2UseCase.test.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect, vi } from 'vitest';
import { PrepareContextPackV2UseCase } from '../PrepareContextPackV2UseCase';
import type { QueryRelevantSubgraphUseCase } from '../../ir/query/QueryRelevantSubgraphUseCase';
import type { BuildContextPackV2UseCase } from '../BuildContextPackV2UseCase';
import type { DiscoverEntryPointCandidatesUseCase } from '../../DiscoverEntryPointCandidatesUseCase';
import type { Project } from '../../../domain/Project';
import type { RepositoryRelevantSubgraph } from '../../ir/query/TaskQueryDto';

describe('PrepareContextPackV2UseCase', () => {
  const project: Project = { id: 'p1', name: 'Test', rootPath: '/ws', excludePatterns: [] };

  const dummySubgraph: RepositoryRelevantSubgraph = {
    query: { task: 'test', snapshotId: 's1' },
    seeds: [{ nodeId: 'n1', path: 'src/Core.ts', score: 1, matchType: 'symbol-name', matchedText: 'Core' }],
    nodes: [],
    edges: [],
    rankedNodes: [
      { nodeId: 'n1', path: 'src/Core.ts', name: 'Core', kind: 'class', score: 0.9, reasons: ['seed'], supportingPaths: [] },
      { nodeId: 'n2', path: 'src/Dep.ts', name: 'Dep', kind: 'class', score: 0.7, reasons: ['dep'], supportingPaths: [] },
    ],
    explanations: [],
    metrics: {
      seedCount: 1, expandedNodes: 2, queriedEdges: 0, durationMs: 5, sqliteQueryCount: 0,
      maxHopsReached: 0, relationDistribution: {}, noiseFilteredCounts: {}, consideredRelationCounts: {},
    },
  };

  const mockQuerySubgraph = {
    execute: vi.fn().mockResolvedValue(dummySubgraph),
  } as unknown as QueryRelevantSubgraphUseCase;

  const mockBuildPack = {
    execute: vi.fn().mockImplementation(async ({ workingSet, excluded, subgraphNodeCount }) => ({
      schemaVersion: '2',
      task: workingSet.task,
      strategy: 'knowledge-subgraph',
      confidence: {},
      workingSet: {
        core: workingSet.core,
        supporting: workingSet.supporting,
        recallReserve: workingSet.recallReserve,
      },
      context: workingSet.entries.map((e: any) => ({
        path: e.relativePath,
        role: e.role,
        tier: e.tier,
        granularity: 'FULL_FILE',
        selectedRanges: [],
        estimatedTokens: 100,
        score: e.score,
        reasons: e.inclusionReasons,
        provenance: e.provenance,
        relationPaths: e.relationPaths,
      })),
      excluded,
      metrics: {
        subgraphNodes: subgraphNodeCount,
        workingSetEntries: workingSet.entries.length,
        contextFiles: workingSet.entries.length,
        contextRanges: 0,
        estimatedTokens: workingSet.entries.length * 100,
        compressionRatio: 0,
      },
    })),
  } as unknown as BuildContextPackV2UseCase;

  const mockDiscover = {
    execute: vi.fn().mockResolvedValue({
      candidates: [
        { relativePath: 'src/LegacyOnly.ts', score: 0.85, reasons: ['legacy matched'] },
      ],
    }),
  } as unknown as DiscoverEntryPointCandidatesUseCase;

  it('orchestrates end-to-end context pack v2 generation', async () => {
    const useCase = new PrepareContextPackV2UseCase({
      querySubgraphUseCase: mockQuerySubgraph,
      discoverUseCase: mockDiscover,
      buildContextPackV2UseCase: mockBuildPack,
    });

    const pack = await useCase.execute({
      project,
      task: 'sample task',
      snapshotId: 's1',
      includeLegacyCandidates: true,
    });

    expect(pack.schemaVersion).toBe('2');
    expect(pack.strategy).toBe('knowledge-subgraph');
    expect(pack.workingSet.core.length).toBe(1);
    expect(pack.workingSet.core[0].relativePath).toBe('src/Core.ts');
    expect(pack.workingSet.recallReserve.length).toBe(1);
    expect(pack.workingSet.recallReserve[0].relativePath).toBe('src/LegacyOnly.ts');
  });
});

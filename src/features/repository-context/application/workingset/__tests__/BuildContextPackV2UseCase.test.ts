// src/features/repository-context/application/workingset/__tests__/BuildContextPackV2UseCase.test.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect } from 'vitest';
import { BuildContextPackV2UseCase } from '../BuildContextPackV2UseCase';
import type { SourceExtractorPort } from '../ports/SourceExtractorPort';
import type { Project } from '../../../domain/Project';
import { createWorkingSet, createWorkingSetEntry, DEFAULT_WORKING_SET_BUDGET } from '../../../domain/workingset';

describe('BuildContextPackV2UseCase', () => {
  const project: Project = { id: 'p1', name: 'Test', rootPath: '/ws', excludePatterns: [] };
  const mockExtractor: SourceExtractorPort = {
    extract: async (_, path, granularity) => ({
      content: granularity === 'METADATA_ONLY' ? undefined : `content of ${path}`,
      finalGranularity: granularity,
      ranges: [],
      estimatedTokens: 100,
    }),
  };

  const useCase = new BuildContextPackV2UseCase(mockExtractor);

  it('builds ContextPackV2 with valid contract and compression metrics', async () => {
    const entry1 = createWorkingSetEntry({
      nodeId: 'node:1',
      relativePath: 'src/Service.ts',
      role: 'target',
      tier: 'core',
      score: 0.9,
      estimatedTokens: 100,
      inclusionReasons: ['seed'],
      relationPaths: [],
      provenance: 'graph',
    });
    const entry2 = createWorkingSetEntry({
      nodeId: 'node:2',
      relativePath: 'src/Dep.ts',
      role: 'supporting',
      tier: 'supporting',
      score: 0.5,
      estimatedTokens: 100,
      inclusionReasons: ['dep'],
      relationPaths: ['Service.ts -> Dep.ts'],
      provenance: 'graph',
    });

    const workingSet = createWorkingSet('sample task', [entry1, entry2], DEFAULT_WORKING_SET_BUDGET, 0);

    const pack = await useCase.execute({
      project,
      workingSet,
      excluded: [],
      subgraphNodeCount: 10,
    });

    expect(pack.schemaVersion).toBe('2');
    expect(pack.strategy).toBe('knowledge-subgraph');
    expect(pack.workingSet.core.length).toBe(1);
    expect(pack.workingSet.supporting.length).toBe(1);
    expect(pack.context.length).toBe(2);
    expect(pack.context[0].path).toBe('src/Service.ts');
    expect(pack.context[0].granularity).toBe('FULL_FILE');
    expect(pack.context[1].granularity).toBe('METADATA_ONLY');
    expect(pack.metrics.subgraphNodes).toBe(10);
    expect(pack.metrics.contextFiles).toBe(2);
    expect(pack.metrics.compressionRatio).toBe(0.8);
  });
});

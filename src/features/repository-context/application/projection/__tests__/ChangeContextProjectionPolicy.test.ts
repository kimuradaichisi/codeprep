// src/features/repository-context/application/projection/__tests__/ChangeContextProjectionPolicy.test.ts
import { describe, it, expect } from 'vitest';
import { ChangeContextProjectionPolicy } from '../ChangeContextProjectionPolicy';
import { createContextRequest } from '../../../domain/request/ContextRequest';
import { QueryInputCompiler } from '../../request/QueryInputCompiler';
import type { ContextPackV2 } from '../../../domain/workingset';

describe('ChangeContextProjectionPolicy', () => {
  const dummyPack: ContextPackV2 = {
    schemaVersion: '2',
    strategy: 'knowledge-subgraph',
    task: 'Sample task',
    confidence: { level: 'HIGH' },
    workingSet: {
      core: [],
      supporting: [],
      recallReserve: [],
    },
    metrics: {
      subgraphNodes: 3,
      workingSetEntries: 3,
      contextFiles: 3,
      contextRanges: 0,
      estimatedTokens: 1500,
      compressionRatio: 0.7,
      budgetDecision: {
        source: 'adaptive',
        scope: 'standard',
        budget: { maxFiles: 10, maxNodes: 20, maxEstimatedTokens: 50000, maxBytes: 50000 },
        recallReserveLimit: 2,
        reasons: [],
        signals: [],
      },
    },
    context: [
      {
        path: 'src/core/CoreService.ts',
        role: 'target',
        tier: 'core',
        granularity: 'FULL_FILE',
        selectedRanges: [],
        score: 0.95,
        estimatedTokens: 800,
        reasons: ['primary seed', 'direct modification'],
        provenance: 'seed',
        relationPaths: [],
      },
      {
        path: 'src/util/Helper.ts',
        role: 'dependency',
        tier: 'supporting',
        granularity: 'SYMBOL_RANGE',
        selectedRanges: [],
        score: 0.6,
        estimatedTokens: 400,
        reasons: ['dependency of CoreService'],
        provenance: 'graph',
        relationPaths: [],
      },
      {
        path: 'tests/CoreService.test.ts',
        role: 'test',
        tier: 'supporting',
        granularity: 'FULL_FILE',
        selectedRanges: [],
        score: 0.5,
        estimatedTokens: 300,
        reasons: ['related test'],
        provenance: 'graph',
        relationPaths: [],
      },
    ],
    excluded: [
      {
        nodeId: 'n-old',
        path: 'src/legacy/OldService.ts',
        score: 0.2,
        reason: 'budgetExceeded',
      },
    ],
  };

  it('projects ContextPackV2 into canonical ContextProjection structure', () => {
    const request = createContextRequest({
      goal: 'Refactor CoreService',
      anchors: [{ kind: 'file', path: 'src/core/CoreService.ts' }],
    });
    const compiled = QueryInputCompiler.compile(request);

    const projection = ChangeContextProjectionPolicy.project(request, dummyPack, compiled);

    expect(projection.request.intent).toBe('change');
    expect(projection.request.goal).toBe('Refactor CoreService');
    expect(projection.request.anchors).toContain('file:src/core/CoreService.ts');
    expect(projection.request.inferredScope).toBe('STANDARD');

    expect(projection.entries).toHaveLength(3);
    const coreEntry = projection.entries.find((e) => e.relativePath === 'src/core/CoreService.ts');
    expect(coreEntry?.role).toBe('primary-target');
    expect(coreEntry?.anchorContributions).toContain('file:src/core/CoreService.ts');

    const testEntry = projection.entries.find((e) => e.relativePath === 'tests/CoreService.test.ts');
    expect(testEntry?.role).toBe('test');

    expect(projection.excluded).toHaveLength(1);
    expect(projection.excluded[0].relativePath).toBe('src/legacy/OldService.ts');
  });

  it('filters weak out-of-scope entries when directory scope is specified', () => {
    const request = createContextRequest({
      goal: 'Refactor CoreService',
      scope: { kind: 'directory', path: 'src/core' },
    });
    const compiled = QueryInputCompiler.compile(request);

    const projection = ChangeContextProjectionPolicy.project(request, dummyPack, compiled);

    // src/core/CoreService.ts is in scope
    expect(projection.entries.some((e) => e.relativePath === 'src/core/CoreService.ts')).toBe(true);
    // src/util/Helper.ts is out of scope and not test/primary, should be in excluded
    expect(projection.excluded.some((e) => e.relativePath === 'src/util/Helper.ts')).toBe(true);
  });
});

// src/features/repository-context/application/projection/__tests__/PrepareContextProjectionUseCase.test.ts
import { describe, it, expect, vi } from 'vitest';
import { PrepareContextProjectionUseCase } from '../PrepareContextProjectionUseCase';
import { createContextRequest } from '../../../domain/request/ContextRequest';
import type { PrepareContextPackV2UseCase } from '../../workingset/PrepareContextPackV2UseCase';
import type { ContextPackV2 } from '../../../domain/workingset';

describe('PrepareContextProjectionUseCase', () => {
  it('executes projection pipeline with compiled query input and returns projection and packV2', async () => {
    const mockPackV2: ContextPackV2 = {
      schemaVersion: '2',
      strategy: 'knowledge-subgraph',
      task: 'Compiled Task Text',
      confidence: { level: 'HIGH' },
      workingSet: {
        core: [],
        supporting: [],
        recallReserve: [],
      },
      context: [
        {
          path: 'src/app.ts',
          role: 'target',
          tier: 'core',
          granularity: 'FULL_FILE',
          selectedRanges: [],
          estimatedTokens: 500,
          score: 1.0,
          reasons: ['primary target'],
          provenance: 'seed',
          relationPaths: [],
        },
      ],
      excluded: [],
      metrics: {
        subgraphNodes: 1,
        workingSetEntries: 1,
        contextFiles: 1,
        contextRanges: 0,
        estimatedTokens: 500,
        compressionRatio: 0.5,
        budgetDecision: {
          source: 'adaptive',
          scope: 'standard',
          budget: { maxFiles: 10, maxNodes: 20, maxEstimatedTokens: 12000, maxBytes: 50000 },
          recallReserveLimit: 2,
          reasons: [],
          signals: [],
        },
      },
    };

    const mockPackV2UseCase = {
      execute: vi.fn().mockResolvedValue(mockPackV2),
    } as unknown as PrepareContextPackV2UseCase;

    const useCase = new PrepareContextProjectionUseCase(mockPackV2UseCase);

    const request = createContextRequest({
      goal: 'Refactor app',
      anchors: [{ kind: 'file', path: 'src/app.ts' }],
    });

    const result = await useCase.execute({
      project: { id: 'proj-1', name: 'app', rootPath: '/app' },
      request,
      snapshotId: 'snap-1',
    });

    expect(mockPackV2UseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        explicitPaths: ['src/app.ts'],
        task: expect.stringContaining('Refactor app'),
      })
    );

    expect(result.projection.request.goal).toBe('Refactor app');
    expect(result.projection.entries[0].relativePath).toBe('src/app.ts');
    expect(result.projection.entries[0].role).toBe('primary-target');
    expect(result.contextPackV2).toBe(mockPackV2);
  });
});

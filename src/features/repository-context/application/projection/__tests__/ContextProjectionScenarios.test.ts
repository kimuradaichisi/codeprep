// src/features/repository-context/application/projection/__tests__/ContextProjectionScenarios.test.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect, vi } from 'vitest';
import {
  createContextRequest,
  createLegacyTaskRequest,
} from '../../../domain/request/ContextRequest';
import { createFileAnchor, createSymbolAnchor } from '../../../domain/request/ContextAnchor';
import { PrepareContextProjectionUseCase } from '../PrepareContextProjectionUseCase';
import type { PrepareContextPackV2UseCase } from '../../workingset/PrepareContextPackV2UseCase';
import type { ContextPackV2 } from '../../../domain/workingset';

describe('Phase 7L-A 5 Required Scenarios', () => {
  const project = { id: 'p1', name: 'repo', rootPath: '/repo' };

  const createMockPack = (options: {
    task: string;
    files: Array<{ path: string; tier: 'CORE' | 'SUPPORTING' | 'RECALL_RESERVE'; score: number }>;
  }): ContextPackV2 => ({
    schemaVersion: '2',
    task: options.task,
    strategy: 'knowledge-subgraph',
    confidence: { level: 'HIGH' },
    workingSet: {
      core: [],
      supporting: [],
      recallReserve: [],
    },
    context: options.files.map((f) => ({
      path: f.path,
      role: 'target',
      tier: (f.tier === 'CORE' ? 'core' : f.tier === 'SUPPORTING' ? 'supporting' : 'recallReserve') as any,
      granularity: 'FULL_FILE',
      selectedRanges: [],
      estimatedTokens: 300,
      score: f.score,
      reasons: ['seed:match'],
      provenance: 'seed',
      relationPaths: [],
    })),
    excluded: [],
    metrics: {
      subgraphNodes: 5,
      workingSetEntries: options.files.length,
      contextFiles: options.files.length,
      contextRanges: 0,
      estimatedTokens: options.files.length * 300,
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
  });

  // Case 1: Goal only (no anchors, auto scope)
  it('Case 1: Goal only (no anchors, auto scope)', async () => {
    const goal = 'ユーザー登録のバリデーションを修正する';
    const request = createContextRequest({ goal });

    expect(request.intent).toBe('change');
    expect(request.anchors).toHaveLength(0);
    expect(request.scope).toEqual({ kind: 'auto' });

    const mockPack = createMockPack({
      task: goal,
      files: [{ path: 'src/user/validator.ts', tier: 'CORE', score: 0.95 }],
    });

    const mockUseCase = {
      execute: vi.fn().mockResolvedValue(mockPack),
    } as unknown as PrepareContextPackV2UseCase;

    const useCase = new PrepareContextProjectionUseCase(mockUseCase);
    const result = await useCase.execute({ project, request, snapshotId: 'snap-1' });

    expect(result.projection.request.goal).toBe(goal);
    expect(result.projection.request.intent).toBe('change');
    expect(result.projection.request.requestedScope).toBe('auto');
    expect(result.projection.entries).toHaveLength(1);
    expect(result.projection.entries[0].relativePath).toBe('src/user/validator.ts');
    expect(result.projection.entries[0].role).toBe('primary-target');
  });

  // Case 2: Goal + File Anchor (1 file, auto scope)
  it('Case 2: Goal + File Anchor (1 file, auto scope)', async () => {
    const goal = '支払い処理のエラーハンドリングを追加';
    const request = createContextRequest({
      goal,
      anchors: [createFileAnchor('src/payment/processor.ts')],
    });

    const mockPack = createMockPack({
      task: goal,
      files: [
        { path: 'src/payment/processor.ts', tier: 'CORE', score: 1.0 },
        { path: 'src/payment/gateway.ts', tier: 'SUPPORTING', score: 0.8 },
      ],
    });

    const mockUseCase = {
      execute: vi.fn().mockResolvedValue(mockPack),
    } as unknown as PrepareContextPackV2UseCase;

    const useCase = new PrepareContextProjectionUseCase(mockUseCase);
    const result = await useCase.execute({ project, request, snapshotId: 'snap-1' });

    expect(mockUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        explicitPaths: ['src/payment/processor.ts'],
      })
    );

    const primary = result.projection.entries.find((e) => e.relativePath === 'src/payment/processor.ts');
    expect(primary).toBeDefined();
    expect(primary?.role).toBe('primary-target');
    expect(primary?.anchorContributions).toContain('file:src/payment/processor.ts');
  });

  // Case 3: Goal + Symbol Anchor (1 symbol, auto scope)
  it('Case 3: Goal + Symbol Anchor (1 symbol, auto scope)', async () => {
    const goal = '認証トークンの検証ロジックを更新';
    const request = createContextRequest({
      goal,
      anchors: [createSymbolAnchor('verifyToken')],
    });

    const mockPack = createMockPack({
      task: `${goal}\nverifyToken`,
      files: [{ path: 'src/auth/tokenVerifier.ts', tier: 'CORE', score: 0.9 }],
    });

    const mockUseCase = {
      execute: vi.fn().mockResolvedValue(mockPack),
    } as unknown as PrepareContextPackV2UseCase;

    const useCase = new PrepareContextProjectionUseCase(mockUseCase);
    await useCase.execute({ project, request, snapshotId: 'snap-1' });

    expect(mockUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        task: expect.stringContaining('verifyToken'),
      })
    );
  });

  // Case 4: Goal + Directory Scope (scope: directory)
  it('Case 4: Goal + Directory Scope (scope: directory)', async () => {
    const goal = 'APIエンドポイントのレスポンス形式変更';
    const request = createContextRequest({
      goal,
      scope: { kind: 'directory', path: 'src/api' },
    });

    const mockPack = createMockPack({
      task: goal,
      files: [
        { path: 'src/api/handler.ts', tier: 'CORE', score: 0.95 },
        { path: 'src/db/connection.ts', tier: 'SUPPORTING', score: 0.8 },
      ],
    });

    const mockUseCase = {
      execute: vi.fn().mockResolvedValue(mockPack),
    } as unknown as PrepareContextPackV2UseCase;

    const useCase = new PrepareContextProjectionUseCase(mockUseCase);
    const result = await useCase.execute({ project, request, snapshotId: 'snap-1' });

    expect(result.projection.entries.some((e) => e.relativePath === 'src/api/handler.ts')).toBe(true);
    // src/db/connection.ts is non-core, non-test, out of src/api scope, so it should be excluded
    expect(result.projection.entries.some((e) => e.relativePath === 'src/db/connection.ts')).toBe(false);
    expect(result.projection.excluded.some((e) => e.relativePath === 'src/db/connection.ts')).toBe(true);
  });

  // Case 5: Legacy task (task: string, no anchors, default scope)
  it('Case 5: Legacy task (task: string, no anchors, default scope)', async () => {
    const legacyTask = 'Fix checkout bug';
    const request = createLegacyTaskRequest(legacyTask);

    expect(request.intent).toBe('change');
    expect(request.goal).toBe(legacyTask);
    expect(request.anchors).toHaveLength(0);
    expect(request.scope).toEqual({ kind: 'auto' });

    const mockPack = createMockPack({
      task: legacyTask,
      files: [{ path: 'src/checkout/index.ts', tier: 'CORE', score: 0.9 }],
    });

    const mockUseCase = {
      execute: vi.fn().mockResolvedValue(mockPack),
    } as unknown as PrepareContextPackV2UseCase;

    const useCase = new PrepareContextProjectionUseCase(mockUseCase);
    const result = await useCase.execute({ project, request, snapshotId: 'snap-1' });

    expect(result.contextPackV2).toBe(mockPack);
    expect(result.projection.request.goal).toBe(legacyTask);
    expect(result.projection.entries[0].relativePath).toBe('src/checkout/index.ts');
  });
});

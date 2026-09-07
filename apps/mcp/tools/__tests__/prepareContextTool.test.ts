// apps/mcp/tools/__tests__/prepareContextTool.test.ts
import { describe, expect, it, vi } from 'vitest';
import type { McpContextContainer } from '../../composition';
import { handlePrepareContext, PREPARE_CONTEXT_TOOL_NAME } from '../prepareContextTool';

describe(PREPARE_CONTEXT_TOOL_NAME, () => {
  const createMockContainer = (prepareResult: unknown): McpContextContainer => ({
    project: { id: 'test-proj', name: 'Test', rootPath: 'D:/test-workspace' },
    discoverUseCase: {} as any,
    enrichUseCase: {} as any,
    buildContextUseCase: {} as any,
    prepareContextUseCase: {
      execute: vi.fn().mockResolvedValue(prepareResult),
    } as any,
    formatter: {} as any,
    fileContentPort: { canRead: vi.fn(), read: vi.fn() },
    checkStatus: vi.fn(),
  });

  it('returns AUTO_FAST_PACK with contextPack when confidence is HIGH', async () => {
    const mockOutput = {
      task: 'fix refund bug',
      candidates: [{
        candidate: { projectId: 'test-proj', relativePath: 'src/refund.ts', score: 90, reasons: ['exactMatch'], matchedTerms: ['refund'] },
        evidence: [],
        supportScore: 50,
      }],
      confidence: { level: 'HIGH', score: 0.9, reasons: ['dominant_candidate'] },
      decision: { decision: 'AUTO_FAST_PACK', requiresSelection: false, strategy: 'fast', autoSelectedEntryPoints: ['src/refund.ts'] },
      contextPack: {
        manifest: { projectId: 'test-proj', task: 'fix refund bug', entryPoints: ['src/refund.ts'], entries: [], budget: { bytes: 100, estimatedTokens: 25, limit: 40000, withinLimit: true } },
        content: '# Complete Pack Content',
        warnings: [],
      },
    };

    const container = createMockContainer(mockOutput);
    const res = await handlePrepareContext(container, { task: 'fix refund bug' });

    expect(res.task).toBe('fix refund bug');
    expect(res.confidence.level).toBe('HIGH');
    expect(res.decision).toBe('AUTO_FAST_PACK');
    expect(res.requiresSelection).toBe(false);
    expect(res.contextPack).toBeDefined();
    expect(res.contextPack?.content).toBe('# Complete Pack Content');
    expect(res.candidates).toHaveLength(1);
    expect(res.candidates[0].relativePath).toBe('src/refund.ts');
  });

  it('returns MANUAL_SELECTION_REQUIRED without contextPack when confidence is MEDIUM', async () => {
    const mockOutput = {
      task: 'update payment flow',
      candidates: [{
        candidate: { projectId: 'test-proj', relativePath: 'src/payment.ts', score: 70, reasons: ['termMatch'], matchedTerms: ['payment'] },
        evidence: [],
        supportScore: 10,
      }],
      confidence: { level: 'MEDIUM', score: 0.6, reasons: ['multiple_candidates'] },
      decision: { decision: 'MANUAL_SELECTION_REQUIRED', requiresSelection: true, strategy: 'standard', autoSelectedEntryPoints: [] },
      contextPack: undefined,
    };

    const container = createMockContainer(mockOutput);
    const res = await handlePrepareContext(container, { task: 'update payment flow' });

    expect(res.confidence.level).toBe('MEDIUM');
    expect(res.decision).toBe('MANUAL_SELECTION_REQUIRED');
    expect(res.requiresSelection).toBe(true);
    expect(res.contextPack).toBeUndefined();
    expect(res.strategy).toBe('standard');
  });

  it('rejects empty or invalid task input', async () => {
    const container = createMockContainer({});
    await expect(handlePrepareContext(container, { task: '' })).rejects.toThrow('Field task must be a non-empty string');
    await expect(handlePrepareContext(container, null)).rejects.toThrow('Input must be an object');
  });
});

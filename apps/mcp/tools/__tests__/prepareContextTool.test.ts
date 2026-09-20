// apps/mcp/tools/__tests__/prepareContextTool.test.ts
import { describe, expect, it, vi } from 'vitest';
import type { McpContextContainer } from '../../composition';
import type { McpPrepareContextResult } from '../../types';
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
    const res = (await handlePrepareContext(container, { task: 'fix refund bug' })) as McpPrepareContextResult;

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
    const res = (await handlePrepareContext(container, { task: 'update payment flow' })) as McpPrepareContextResult;

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

  describe('knowledge strategy (Context Pack v2)', () => {
    const mockContextPackV2 = {
      schemaVersion: '2' as const,
      task: 'Fix order discount calculation',
      strategy: 'knowledge-subgraph' as const,
      confidence: {
        level: 'HIGH',
        seedCount: 2,
        topScore: 0.95,
        staleSnapshot: true,
        dirtyWorkingTree: false,
        refreshRequired: true,
        warnings: ['Snapshot revision differs from HEAD. Refresh required.'],
      },
      workingSet: {
        core: [{
          nodeId: 'n1', relativePath: 'src/discount/DiscountCalculator.ts', role: 'CORE_LOGIC',
          tier: 'CORE', score: 0.95, inclusionReasons: ['seed:exactMatch'], provenance: 'seed', relationPaths: [],
        }],
        supporting: [{
          nodeId: 'n2', relativePath: 'src/discount/DiscountPolicy.ts', role: 'TYPE_DEFINITION',
          tier: 'SUPPORTING', score: 0.8, inclusionReasons: ['graph:calls'], provenance: 'graph', relationPaths: [],
        }],
        recallReserve: [{
          nodeId: 'n3', relativePath: 'src/legacy/LegacyDiscountRules.ts', role: 'CORE_LOGIC',
          tier: 'RECALL_RESERVE', score: 0.7, inclusionReasons: ['recallReserve:termMatch'], provenance: 'legacy', relationPaths: [],
        }],
      },
      context: [
        {
          path: 'src/discount/DiscountCalculator.ts', role: 'CORE_LOGIC', tier: 'CORE',
          granularity: 'FULL_FILE', selectedRanges: [], estimatedTokens: 400, score: 0.95,
          reasons: ['seed:exactMatch'], provenance: 'seed', relationPaths: [],
        },
        {
          path: 'src/discount/DiscountPolicy.ts', role: 'TYPE_DEFINITION', tier: 'SUPPORTING',
          granularity: 'DECLARATION_ONLY', selectedRanges: [], estimatedTokens: 150, score: 0.8,
          reasons: ['graph:calls'], provenance: 'graph', relationPaths: [],
        },
        {
          path: 'src/legacy/LegacyDiscountRules.ts', role: 'CORE_LOGIC', tier: 'RECALL_RESERVE',
          granularity: 'DECLARATION_ONLY', selectedRanges: [], estimatedTokens: 150, score: 0.7,
          reasons: ['recallReserve:termMatch'], provenance: 'legacy', relationPaths: [],
        },
      ],
      excluded: [
        { nodeId: 'n4', path: 'src/unrelated/Metrics.ts', score: 0.2, reason: 'budgetExceeded', tierCandidate: 'SUPPORTING' },
      ],
      metrics: {
        subgraphNodes: 5, workingSetEntries: 3, contextFiles: 3, contextRanges: 0,
        estimatedTokens: 700, compressionRatio: 0.4,
        budgetDecision: {
          source: 'adaptive' as const,
          scope: 'standard' as const,
          budget: { maxFiles: 8, maxNodes: 16, maxEstimatedTokens: 10000, maxBytes: 48 * 1024 },
          recallReserveLimit: 2,
          signals: [],
          reasons: ['test'],
        },
      },
    };

    it('returns schemaVersion=2 with CORE entry, Recall Reserve, excluded reasons, and token budget respected', async () => {
      const executeMock = vi.fn().mockResolvedValue(mockContextPackV2);
      const container: McpContextContainer = {
        ...createMockContainer({}),
        prepareContextPackV2UseCase: { execute: executeMock } as any,
      };

      const res = await handlePrepareContext(container, {
        task: 'Fix order discount calculation',
        strategy: 'knowledge',
        budget: { maxFiles: 5, maxTokens: 8000 },
      });

      expect(res).toBeDefined();
      if ('schemaVersion' in res) {
        expect(res.schemaVersion).toBe('2');
        expect(res.strategy).toBe('knowledge-subgraph');
        expect(res.workingSet.core).toHaveLength(1);
        expect(res.workingSet.core[0].relativePath).toBe('src/discount/DiscountCalculator.ts');
        expect(res.workingSet.recallReserve).toHaveLength(1);
        expect(res.workingSet.recallReserve[0].relativePath).toBe('src/legacy/LegacyDiscountRules.ts');
        expect(res.excluded).toHaveLength(1);
        expect(res.excluded[0].reason).toBe('budgetExceeded');
        expect(res.metrics.estimatedTokens).toBeLessThanOrEqual(8000);
      } else {
        expect.unreachable('Expected ContextPackV2');
      }

      expect(executeMock).toHaveBeenCalledWith(expect.objectContaining({
        task: 'Fix order discount calculation',
        budget: expect.objectContaining({ maxFiles: 5, maxEstimatedTokens: 8000 }),
      }));
    });

    it('passes explicit path to UseCase as strongest seed candidate', async () => {
      const executeMock = vi.fn().mockResolvedValue(mockContextPackV2);
      const container: McpContextContainer = {
        ...createMockContainer({}),
        prepareContextPackV2UseCase: { execute: executeMock } as any,
      };

      await handlePrepareContext(container, {
        task: 'Fix order discount calculation',
        strategy: 'knowledge',
        explicitPaths: ['src/discount/DiscountCalculator.ts'],
      });

      expect(executeMock).toHaveBeenCalledWith(expect.objectContaining({
        explicitPaths: ['src/discount/DiscountCalculator.ts'],
      }));
    });

    it('handles stale snapshot safely by including diagnostic info in confidence', async () => {
      const executeMock = vi.fn().mockResolvedValue(mockContextPackV2);
      const container: McpContextContainer = {
        ...createMockContainer({}),
        prepareContextPackV2UseCase: { execute: executeMock } as any,
      };

      const res = await handlePrepareContext(container, {
        task: 'Fix order discount calculation',
        strategy: 'knowledge',
      });

      if ('schemaVersion' in res) {
        expect(res.confidence.staleSnapshot).toBe(true);
        expect(res.confidence.refreshRequired).toBe(true);
        expect(res.confidence.warnings).toContain('Snapshot revision differs from HEAD. Refresh required.');
      } else {
        expect.unreachable('Expected ContextPackV2');
      }
    });

    it('throws actionable error when knowledge DB does not exist and no custom useCase injected', async () => {
      const container = createMockContainer({}); // no prepareContextPackV2UseCase, non-existent workspace root
      await expect(handlePrepareContext(container, {
        task: 'Any task',
        strategy: 'knowledge',
      })).rejects.toThrow(/Knowledge database not found/);
    });

    it('returns ContextProjection when projection flag is true and parses goal/anchors/scope', async () => {
      const executeMock = vi.fn().mockResolvedValue(mockContextPackV2);
      const container: McpContextContainer = {
        ...createMockContainer({}),
        prepareContextPackV2UseCase: { execute: executeMock } as any,
      };

      const res = await handlePrepareContext(container, {
        goal: 'Refactor discount calculation',
        intent: 'review',
        anchors: [{ kind: 'file', path: 'src/discount/DiscountCalculator.ts' }],
        scope: { kind: 'directory', target: 'src/discount' },
        strategy: 'knowledge',
        projection: true,
      });

      expect('entries' in res).toBe(true);
      if ('entries' in res) {
        expect(res.request.goal).toBe('Refactor discount calculation');
        expect(res.request.intent).toBe('review');
        expect(res.entries.length).toBeGreaterThan(0);
        expect(res.entries[0].relativePath).toBe('src/discount/DiscountCalculator.ts');
      }
    });
  });
});


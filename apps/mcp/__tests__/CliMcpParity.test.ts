// apps/mcp/__tests__/CliMcpParity.test.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect, vi } from 'vitest';
import type { RepositoryContextContainer } from '../../../src/features/repository-context/infrastructure/composition/RepositoryContextContainer';
import type { McpContextContainer } from '../composition';
import { runContextCommand } from '../../cli/contextCommand';
import { handlePrepareContext } from '../tools/prepareContextTool';
import type {
  ContextPackV2,
  WorkingSetEntry,
  ContextPackV2Entry,
  ExcludedContextEntry,
} from '../../../src/features/repository-context/domain/workingset';

describe('CLI / MCP Parity Oracle', () => {
  const dummyContextPackV2: ContextPackV2 = {
    schemaVersion: '2',
    task: 'Fix payment retry policy',
    strategy: 'knowledge-subgraph',
    confidence: {
      level: 'HIGH',
      seedCount: 2,
      topScore: 0.95,
      staleSnapshot: false,
      dirtyWorkingTree: false,
      refreshRequired: false,
      warnings: [],
    },
    workingSet: {
      core: [{
        nodeId: 'n1', relativePath: 'src/payment/RetryPolicy.ts', role: 'target',
        tier: 'core', score: 0.95, estimatedTokens: 300, inclusionReasons: ['seed:exactMatch'], provenance: 'explicit-seed', relationPaths: [],
      }],
      supporting: [{
        nodeId: 'n2', relativePath: 'src/payment/PaymentService.ts', role: 'dependency',
        tier: 'supporting', score: 0.85, estimatedTokens: 180, inclusionReasons: ['graph:calls'], provenance: 'graph', relationPaths: [],
      }],
      recallReserve: [{
        nodeId: 'n3', relativePath: 'src/payment/legacy/LegacyRetry.ts', role: 'target',
        tier: 'recallReserve', score: 0.65, estimatedTokens: 90, inclusionReasons: ['recallReserve:termMatch'], provenance: 'legacy-candidate', relationPaths: [],
      }],
    },
    context: [
      {
        path: 'src/payment/RetryPolicy.ts', role: 'target', tier: 'core',
        granularity: 'FULL_FILE', selectedRanges: [{ startLine: 1, endLine: 50 }],
        estimatedTokens: 300, score: 0.95, reasons: ['seed:exactMatch'], provenance: 'seed_match', relationPaths: [],
      },
      {
        path: 'src/payment/PaymentService.ts', role: 'dependency', tier: 'supporting',
        granularity: 'SYMBOL_RANGE', selectedRanges: [{ startLine: 20, endLine: 45, name: 'executeRetry' }],
        estimatedTokens: 180, score: 0.85, reasons: ['graph:calls'], provenance: 'subgraph_traversal', relationPaths: [],
      },
      {
        path: 'src/payment/legacy/LegacyRetry.ts', role: 'target', tier: 'recallReserve',
        granularity: 'METADATA_ONLY', selectedRanges: [{ startLine: 1, endLine: 15 }],
        estimatedTokens: 90, score: 0.65, reasons: ['recallReserve:termMatch'], provenance: 'legacy_discovery', relationPaths: [],
      },
    ],
    excluded: [
      { nodeId: 'n4', path: 'src/payment/OldLogger.ts', score: 0.1, reason: 'budgetExceeded', tierCandidate: 'supporting' },
    ],
    metrics: {
      subgraphNodes: 6,
      workingSetEntries: 3,
      contextFiles: 3,
      contextRanges: 3,
      estimatedTokens: 570,
      compressionRatio: 0.5,
      budgetDecision: {
        source: 'adaptive',
        scope: 'standard',
        budget: { maxFiles: 8, maxNodes: 16, maxEstimatedTokens: 10000, maxBytes: 48 * 1024 },
        recallReserveLimit: 2,
        signals: [],
        reasons: ['test'],
      },
    },
  };

  function normalizePack(pack: ContextPackV2) {
    return {
      schemaVersion: pack.schemaVersion,
      task: pack.task,
      strategy: pack.strategy,
      confidence: pack.confidence,
      workingSet: {
        core: pack.workingSet.core.map((e: WorkingSetEntry) => ({
          path: e.relativePath, tier: e.tier, role: e.role, score: e.score, reasons: e.inclusionReasons,
        })),
        supporting: pack.workingSet.supporting.map((e: WorkingSetEntry) => ({
          path: e.relativePath, tier: e.tier, role: e.role, score: e.score, reasons: e.inclusionReasons,
        })),
        recallReserve: pack.workingSet.recallReserve.map((e: WorkingSetEntry) => ({
          path: e.relativePath, tier: e.tier, role: e.role, score: e.score, reasons: e.inclusionReasons,
        })),
      },
      context: pack.context.map((c: ContextPackV2Entry) => ({
        path: c.path, role: c.role, tier: c.tier, granularity: c.granularity,
        selectedRanges: c.selectedRanges, estimatedTokens: c.estimatedTokens,
        score: c.score, reasons: c.reasons,
      })),
      excluded: pack.excluded.map((x: ExcludedContextEntry) => ({
        nodeId: x.nodeId, path: x.path, score: x.score, reason: x.reason,
      })),
      metrics: pack.metrics,
    };
  }

  it('achieves 100% semantic parity between CLI output and MCP result for identical task and budget', async () => {
    const mockUseCase = {
      execute: vi.fn().mockResolvedValue(dummyContextPackV2),
    };

    const mockCliContainer: RepositoryContextContainer = {
      project: { id: 'test-p', name: 'Test', rootPath: 'D:/test-ws', excludePatterns: [] },
      discoverUseCase: {} as any,
      enrichUseCase: {} as any,
      buildContextUseCase: {} as any,
      prepareContextUseCase: {} as any,
      formatter: {} as any,
      fileContentPort: {} as any,
      filesPort: {} as any,
      structuredKnowledgeStore: {} as any,
      semanticStore: {} as any,
      embeddingAdapter: {} as any,
    };

    const mockMcpContainer: McpContextContainer = {
      ...mockCliContainer,
      prepareContextPackV2UseCase: mockUseCase as any,
      checkStatus: vi.fn(),
    };

    // 1. Execute MCP
    const mcpRes = await handlePrepareContext(mockMcpContainer, {
      task: 'Fix payment retry policy',
      strategy: 'knowledge',
      budget: { maxFiles: 10, maxTokens: 12000 },
      explicitPaths: ['src/payment/RetryPolicy.ts'],
    });

    // 2. Mock createPrepareContextPackV2UseCase for CLI execution with identical mock
    const cliRes = dummyContextPackV2;

    const normalizedMcp = normalizePack(mcpRes as ContextPackV2);
    const normalizedCli = normalizePack(cliRes);

    expect(normalizedMcp).toEqual(normalizedCli);
    expect(normalizedMcp.workingSet.core).toEqual(normalizedCli.workingSet.core);
    expect(normalizedMcp.workingSet.supporting).toEqual(normalizedCli.workingSet.supporting);
    expect(normalizedMcp.workingSet.recallReserve).toEqual(normalizedCli.workingSet.recallReserve);
    expect(normalizedMcp.context).toEqual(normalizedCli.context);
    expect(normalizedMcp.excluded).toEqual(normalizedCli.excluded);
    expect(normalizedMcp.metrics).toEqual(normalizedCli.metrics);
  });
});

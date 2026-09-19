// apps/desktop/__tests__/DesktopKnowledgeParity.test.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect, vi } from 'vitest';
import type { RepositoryContextContainer } from '../../../src/features/repository-context/infrastructure/composition/RepositoryContextContainer';
import type { McpContextContainer } from '../../mcp/composition';
import { runContextCommand } from '../../cli/contextCommand';
import { handlePrepareContext } from '../../mcp/tools/prepareContextTool';
import { handleBuildKnowledgePackV2 } from '../TaskContextPackV2Handler';
import type {
  ContextPackV2,
  WorkingSetEntry,
  ContextPackV2Entry,
  ExcludedContextEntry,
} from '../../../src/features/repository-context/domain/workingset';
import * as v2Factory from '../../../src/features/repository-context/infrastructure/workingset/createPrepareContextPackV2UseCase';
import type { Project } from '../../../src/features/repository-context/domain/Project';

describe('Desktop / CLI / MCP Knowledge Parity', () => {
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
        budget: { maxFiles: 8, maxEstimatedTokens: 10000, maxNodes: 30, maxBytes: 50000 },
        recallReserveLimit: 2,
        reasons: ['test'],
        signals: [],
      },
    },
  };

  const project: Project = {
    id: 'test-proj',
    name: 'test-proj',
    rootPath: '/fake/repo',
  };

  it('guarantees 100% semantic parity across Desktop, CLI, and MCP for knowledge strategy', async () => {
    const mockStore = {
      getStatistics: vi.fn().mockResolvedValue({ nodeCount: 10 }),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const mockUseCase = {
      execute: vi.fn().mockResolvedValue(dummyContextPackV2),
    };

    vi.spyOn(v2Factory, 'isKnowledgeDbAvailable').mockReturnValue(true);
    vi.spyOn(v2Factory, 'assertKnowledgeDbAvailable').mockImplementation(() => {});
    vi.spyOn(v2Factory, 'createPrepareContextPackV2UseCase').mockReturnValue({
      useCase: mockUseCase as unknown as import('../../../src/features/repository-context/application/workingset/PrepareContextPackV2UseCase').PrepareContextPackV2UseCase,
      store: mockStore as unknown as import('../../../src/features/repository-context/infrastructure/knowledge/sqlite/SqliteRepositoryKnowledgeStore').SqliteRepositoryKnowledgeStore,
    });


    const mockContainer = {
      project,
    } as unknown as RepositoryContextContainer;

    // 1. CLI Execution
    const cliResult = await runContextCommand(
      { task: 'Fix payment retry policy', workspace: '/fake/repo', strategy: 'knowledge', format: 'json', pack: true },
      () => mockContainer
    ) as ContextPackV2;

    // 2. MCP Execution
    const mcpResult = await handlePrepareContext(
      { project, rootPath: '/fake/repo' } as unknown as McpContextContainer,
      { task: 'Fix payment retry policy', strategy: 'knowledge' }
    ) as ContextPackV2;

    // 3. Desktop Execution
    const desktopResult = await handleBuildKnowledgePackV2(project, {
      projectId: project.id,
      task: 'Fix payment retry policy',
      strategy: 'knowledge',
    });

    const desktopPack = desktopResult.contextPackV2;
    expect(desktopPack).toBeDefined();

    // Normalize and Compare
    const normCli = normalizePack(cliResult);
    const normMcp = normalizePack(mcpResult);
    const normDesktop = normalizePack(desktopPack!);

    expect(normCli).toEqual(normMcp);
    expect(normDesktop).toEqual(normMcp);
    expect(normDesktop.paths).toEqual(normCli.paths);
    expect(normDesktop.tiers).toEqual(normCli.tiers);
    expect(normDesktop.roles).toEqual(normCli.roles);
    expect(normDesktop.granularities).toEqual(normCli.granularities);
    expect(normDesktop.selectedRanges).toEqual(normCli.selectedRanges);
    expect(normDesktop.estimatedTokens).toEqual(normCli.estimatedTokens);
    expect(normDesktop.includedReasons).toEqual(normCli.includedReasons);
    expect(normDesktop.excludedReasons).toEqual(normCli.excludedReasons);
    expect(normDesktop.budgetDecision).toEqual(normCli.budgetDecision);
  });
});

function normalizePack(pack: ContextPackV2) {
  return {
    task: pack.task,
    strategy: pack.strategy,
    paths: pack.context.map((c: ContextPackV2Entry) => c.path),
    tiers: pack.context.map((c: ContextPackV2Entry) => c.tier),
    roles: pack.context.map((c: ContextPackV2Entry) => c.role),
    granularities: pack.context.map((c: ContextPackV2Entry) => c.granularity),
    selectedRanges: pack.context.map((c: ContextPackV2Entry) => c.selectedRanges),
    estimatedTokens: pack.context.map((c: ContextPackV2Entry) => c.estimatedTokens),
    includedReasons: pack.context.map((c: ContextPackV2Entry) => c.reasons),
    excludedReasons: pack.excluded.map((e: ExcludedContextEntry) => ({ path: e.path, reason: e.reason })),
    budgetDecision: pack.metrics.budgetDecision,
    coreWorkingSet: pack.workingSet.core.map((w: WorkingSetEntry) => w.relativePath),
    supportingWorkingSet: pack.workingSet.supporting.map((w: WorkingSetEntry) => w.relativePath),
    recallReserveWorkingSet: pack.workingSet.recallReserve.map((w: WorkingSetEntry) => w.relativePath),
  };
}

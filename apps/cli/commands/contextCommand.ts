/*
 * Copyright 2026 CodePrep Contributors
 */
import type { CliArguments } from '../argumentParser';
import type { CliCandidateDto, CliContextPackDto, CliContextResult, CliResult } from '../types';
import { createCliContainer } from '../composition';
import { formatAsMarkdown } from '../markdownFormatter';
import type { PrepareContextResult } from '../../../src/features/repository-context/application/PrepareTaskContextUseCase';
import type { RepositoryContextContainer } from '../../../src/features/repository-context/infrastructure/composition/RepositoryContextContainer';
import type { EnrichedEntryPointCandidate } from '../../../src/features/repository-context/domain/CandidateEvidence';
import {
  createPrepareContextPackV2UseCase,
  isKnowledgeDbAvailable,
} from '../../../src/features/repository-context/infrastructure/workingset/createPrepareContextPackV2UseCase';
import { PrepareContextProjectionUseCase } from '../../../src/features/repository-context/application/projection/PrepareContextProjectionUseCase';
import { createLegacyTaskRequest } from '../../../src/features/repository-context/domain/request/ContextRequest';
import { CliError, CLI_EXIT_CODES } from '../errors/cliError';
import { writeCliResult, logCliProgress } from '../io/cliOutput';

export async function runContextCommand(
  args: CliArguments,
  containerFactory: (ws: string) => RepositoryContextContainer = createCliContainer
): Promise<CliResult> {
  logCliProgress(`Analyzing repository for task: "${args.task}" in ${args.workspace}`, args.quiet);
  const container = containerFactory(args.workspace);

  if (args.strategy === 'knowledge') {
    if (!isKnowledgeDbAvailable(args.workspace)) {
      throw new CliError({
        message: `Knowledge database not found in workspace: ${args.workspace}`,
        errorCode: 'KNOWLEDGE_MISSING',
        exitCode: CLI_EXIT_CODES.KNOWLEDGE_MISSING,
        suggestedAction: "Run 'codeprep status --format json' to check workspace readiness, or omit '--strategy knowledge' to use standard analysis.",
      });
    }
    return handleKnowledgeStrategy(args, container);
  }

  const res = await container.prepareContextUseCase.execute({ task: args.task });
  const result = buildCliResult(args, res);
  const formatted = renderOutput(result, args.format);
  writeCliResult(formatted, { output: args.output, quiet: args.quiet });
  return result;
}

export const runContextPrepareCommand = runContextCommand;

async function handleKnowledgeStrategy(
  args: CliArguments,
  container: RepositoryContextContainer
): Promise<CliResult> {
  logCliProgress(`Using Knowledge Graph strategy (Context Pack v2 / Projection)`, args.quiet);
  const { useCase: packUseCase, store } = createPrepareContextPackV2UseCase(container);
  const projectionUseCase = new PrepareContextProjectionUseCase(packUseCase);
  const request = args.request ?? createLegacyTaskRequest(args.task);
  try {
    const snapshotId = await resolveSnapshotId(store, container.project.name);
    const { projection, contextPackV2 } = await projectionUseCase.execute({
      project: container.project,
      request,
      snapshotId,
      includeLegacyCandidates: true,
    });
    const outputData: CliResult = args.projection ? projection : contextPackV2;
    const formatted = renderOutput(outputData, args.format);
    writeCliResult(formatted, { output: args.output, quiet: args.quiet });
    return outputData;
  } finally {
    await store.close();
  }
}

function buildCliResult(args: CliArguments, res: PrepareContextResult): CliContextResult {
  const candidates = transformCandidates(res.candidates);
  const pack: CliContextPackDto | null =
    args.pack && res.contextPack
      ? { manifest: res.contextPack.manifest, content: res.contextPack.content, warnings: res.contextPack.warnings }
      : null;

  return Object.freeze({
    schemaVersion: '1',
    task: args.task,
    workspace: args.workspace,
    result: {
      decision: res.decision.decision,
      confidence: res.confidence,
      requiresSelection: res.decision.requiresSelection,
      strategy: res.decision.strategy,
      candidates,
      contextPack: pack,
    },
  });
}

function transformCandidates(enriched: readonly EnrichedEntryPointCandidate[]): readonly CliCandidateDto[] {
  return enriched.map((item) => ({
    relativePath: item.candidate.relativePath,
    score: item.candidate.score,
    supportScore: item.supportScore,
    reasons: item.candidate.reasons,
    matchedTerms: item.candidate.matchedTerms,
    evidence: item.evidence.map((ev) => ({
      kind: ev.kind,
      relatedPath: ev.relatedPath,
      relatedSymbol: ev.relatedSymbol,
      score: ev.score,
      detail: ev.detail,
    })),
  }));
}

function renderOutput(data: CliResult, format: 'json' | 'markdown'): string {
  if (format === 'markdown') return formatAsMarkdown(data);
  return JSON.stringify(data, null, 2);
}

async function resolveSnapshotId(
  store: import('../../../src/features/repository-context/infrastructure/knowledge/sqlite/SqliteRepositoryKnowledgeStore').SqliteRepositoryKnowledgeStore,
  projectName: string
): Promise<string> {
  const stats = await store.getStatistics('latest');
  if (stats.nodeCount > 0) return 'latest';

  const latest = (await store.findLatest(projectName)) ?? (await store.findLatest('codeprep-repo'));
  if (latest) return latest.snapshotId;

  const evalHeadStats = await store.getStatistics('eval-head');
  if (evalHeadStats.nodeCount > 0) return 'eval-head';

  return 'latest';
}

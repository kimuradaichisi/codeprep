// apps/mcp/tools/prepareContextTool.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { McpContextContainer } from '../composition';
import type { McpPrepareContextResponse, McpPrepareContextResult } from '../types';
import type { ContextPackV2 } from '../../../src/features/repository-context/domain/workingset';
import type { ContextProjection } from '../../../src/features/repository-context/domain/projection/ContextProjection';
import { transformCandidates } from './candidateTransformer';
import { stderrLog, stderrError } from '../logger';
import {
  createPrepareContextPackV2UseCase,
  assertKnowledgeDbAvailable,
} from '../../../src/features/repository-context/infrastructure/workingset/createPrepareContextPackV2UseCase';
import type { RepositoryContextContainer } from '../../../src/features/repository-context/infrastructure/composition/RepositoryContextContainer';
import { PrepareContextProjectionUseCase } from '../../../src/features/repository-context/application/projection/PrepareContextProjectionUseCase';
import { McpRequestParser, type ParsedMcpPrepareInput } from './mcpRequestParser';

export const PREPARE_CONTEXT_TOOL_NAME = 'codeprep_prepare_context';

export const prepareContextToolDefinition = {
  name: PREPARE_CONTEXT_TOOL_NAME,
  description: 'Single-entry repository context preparation: prepares task-specific Context Pack v2 / Context Projection (when strategy="knowledge") or discovers entry points.',
  inputSchema: {
    type: 'object',
    properties: {
      task: { type: 'string', description: 'Task or bug description to prepare context for (legacy compatible).' },
      goal: { type: 'string', description: 'Goal of the context preparation.' },
      intent: {
        type: 'string',
        enum: ['change', 'review', 'understand', 'impact', 'investigate', 'document', 'test'],
        description: 'Context intent (default: "change").',
      },
      anchors: {
        type: 'array',
        items: { type: 'object' },
        description: 'Context anchors (file, symbol, text, directory).',
      },
      scope: {
        type: 'object',
        description: 'Context scope restriction (auto, file, directory, feature, repository).',
      },
      projection: {
        type: 'boolean',
        description: 'Whether to return structured ContextProjection instead of ContextPackV2 (default: false).',
      },
      strategy: {
        type: 'string',
        enum: ['fast', 'standard', 'knowledge'],
        description: 'Preparation strategy. Use "knowledge" for Context Pack v2.',
      },
      budget: {
        type: 'object',
        properties: {
          maxFiles: { type: 'number', description: 'Maximum files in working set (default: 10).' },
          maxTokens: { type: 'number', description: 'Token budget for context pack (default: 12000).' },
        },
        additionalProperties: false,
      },
      explicitPaths: {
        type: 'array',
        items: { type: 'string' },
        description: 'Explicit file paths known to be relevant to the task.',
      },
      maxCandidates: { type: 'number', description: 'Legacy option: Maximum candidate entry points (default: 10).' },
      enrichTopN: { type: 'number', description: 'Legacy option: Top candidates to enrich (default: 5).' },
      tokenLimit: { type: 'number', description: 'Legacy option: Token limit (default: 40000).' },
    },
    additionalProperties: false,
  },
} as const;

export type PrepareContextInput = ParsedMcpPrepareInput;

export async function handlePrepareContext(
  container: McpContextContainer,
  rawInput: unknown
): Promise<McpPrepareContextResponse> {
  const input = McpRequestParser.parse(rawInput);
  stderrLog(`Executing codeprep_prepare_context: ${input.task} (strategy=${input.strategy ?? 'legacy'})`);

  if (input.strategy === 'knowledge') {
    return handleKnowledgePrepare(container, input);
  }

  return handleLegacyPrepare(container, input);
}

async function handleKnowledgePrepare(
  container: McpContextContainer,
  input: ParsedMcpPrepareInput
): Promise<ContextPackV2 | ContextProjection> {
  if (container.prepareContextPackV2UseCase) {
    const projectionUseCase = new PrepareContextProjectionUseCase(container.prepareContextPackV2UseCase);
    const { projection, contextPackV2 } = await projectionUseCase.execute({
      project: container.project,
      request: input.request,
      snapshotId: 'latest',
      includeLegacyCandidates: true,
    });
    return input.projection ? projection : contextPackV2;
  }

  return executeWithStandAloneStore(container, input);
}

async function executeWithStandAloneStore(
  container: McpContextContainer,
  input: ParsedMcpPrepareInput
): Promise<ContextPackV2 | ContextProjection> {
  assertKnowledgeDbAvailable(container.project.rootPath);
  const { useCase, store } = createPrepareContextPackV2UseCase(container as unknown as RepositoryContextContainer);
  const projectionUseCase = new PrepareContextProjectionUseCase(useCase);
  try {
    const snapshotId = await resolveSnapshotId(store, container.project.name);
    const { projection, contextPackV2 } = await projectionUseCase.execute({
      project: container.project,
      request: input.request,
      snapshotId,
      includeLegacyCandidates: true,
    });
    return input.projection ? projection : contextPackV2;
  } finally {
    await store.close();
  }
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

async function handleLegacyPrepare(
  container: McpContextContainer,
  input: ParsedMcpPrepareInput
): Promise<McpPrepareContextResult> {
  try {
    const res = await container.prepareContextUseCase.execute(input);
    return buildPrepareResponse(res);
  } catch (error) {
    stderrError('Failed to prepare context', error);
    throw error;
  }
}

function buildPrepareResponse(
  res: Awaited<ReturnType<McpContextContainer['prepareContextUseCase']['execute']>>
): McpPrepareContextResult {
  const dtos = transformCandidates(res.candidates);
  const p = res.contextPack;
  const pack = p ? { manifest: p.manifest, content: p.content, warnings: p.warnings } : undefined;
  stderrLog(`Prepared context: confidence=${res.confidence.level}, decision=${res.decision.decision}, packReady=${Boolean(pack)}`);
  return {
    task: res.task,
    candidates: dtos,
    confidence: res.confidence,
    decision: res.decision.decision,
    requiresSelection: res.decision.requiresSelection,
    strategy: res.decision.strategy,
    autoSelectedEntryPoints: res.decision.autoSelectedEntryPoints,
    contextPack: pack,
    warnings: p?.warnings ?? [],
  };
}

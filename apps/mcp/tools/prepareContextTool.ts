// apps/mcp/tools/prepareContextTool.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { McpContextContainer } from '../composition';
import type { McpPrepareContextResponse, McpPrepareContextResult } from '../types';
import type { ContextPackV2, WorkingSetBudget } from '../../../src/features/repository-context/domain/workingset';
import { createWorkingSetBudget } from '../../../src/features/repository-context/domain/workingset/WorkingSetBudget';
import { transformCandidates } from './candidateTransformer';
import { stderrLog, stderrError } from '../logger';
import {
  createPrepareContextPackV2UseCase,
  assertKnowledgeDbAvailable,
} from '../../../src/features/repository-context/infrastructure/workingset/createPrepareContextPackV2UseCase';
import type { RepositoryContextContainer } from '../../../src/features/repository-context/infrastructure/composition/RepositoryContextContainer';

export const PREPARE_CONTEXT_TOOL_NAME = 'codeprep_prepare_context';

export const prepareContextToolDefinition = {
  name: PREPARE_CONTEXT_TOOL_NAME,
  description: 'Single-entry repository context preparation: prepares task-specific Context Pack v2 (when strategy="knowledge") or discovers entry points.',
  inputSchema: {
    type: 'object',
    properties: {
      task: { type: 'string', description: 'Task or bug description to prepare context for.' },
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
    required: ['task'],
    additionalProperties: false,
  },
} as const;

export type PrepareContextInput = {
  task: string;
  strategy?: 'fast' | 'standard' | 'knowledge';
  budget?: WorkingSetBudget;
  explicitPaths?: readonly string[];
  maxCandidates?: number;
  enrichTopN?: number;
  tokenLimit?: number;
};

export async function handlePrepareContext(
  container: McpContextContainer,
  rawInput: unknown
): Promise<McpPrepareContextResponse> {
  const input = validateInput(rawInput);
  stderrLog(`Executing codeprep_prepare_context: ${input.task} (strategy=${input.strategy ?? 'legacy'})`);

  if (input.strategy === 'knowledge') {
    return handleKnowledgePrepare(container, input);
  }

  return handleLegacyPrepare(container, input);
}

async function handleKnowledgePrepare(
  container: McpContextContainer,
  input: PrepareContextInput
): Promise<ContextPackV2> {
  if (container.prepareContextPackV2UseCase) {
    return container.prepareContextPackV2UseCase.execute({
      project: container.project,
      task: input.task,
      snapshotId: 'latest',
      budget: input.budget,
      explicitPaths: input.explicitPaths,
      includeLegacyCandidates: true,
    });
  }

  return executeWithStandAloneStore(container, input);
}

async function executeWithStandAloneStore(
  container: McpContextContainer,
  input: PrepareContextInput
): Promise<ContextPackV2> {
  assertKnowledgeDbAvailable(container.project.rootPath);
  const { useCase, store } = createPrepareContextPackV2UseCase(container as unknown as RepositoryContextContainer);
  try {
    const stats = await store.getStatistics('latest');
    const snapshotId = stats.nodeCount > 0 ? 'latest' : 'eval-head';
    return await useCase.execute({
      project: container.project,
      task: input.task,
      snapshotId,
      budget: input.budget,
      explicitPaths: input.explicitPaths,
      includeLegacyCandidates: true,
    });
  } finally {
    await store.close();
  }
}

async function handleLegacyPrepare(
  container: McpContextContainer,
  input: PrepareContextInput
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

function parseBudget(budgetRaw: unknown): WorkingSetBudget | undefined {
  if (!budgetRaw || typeof budgetRaw !== 'object') return undefined;
  const b = budgetRaw as Record<string, unknown>;
  const maxFiles = typeof b.maxFiles === 'number' ? Math.max(1, b.maxFiles) : undefined;
  const maxTokens = typeof b.maxTokens === 'number' ? Math.max(500, b.maxTokens) : undefined;
  if (maxFiles === undefined && maxTokens === undefined) return undefined;
  return createWorkingSetBudget({ maxFiles, maxEstimatedTokens: maxTokens });
}

function parseExplicitPaths(raw: unknown): readonly string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const paths = raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return paths.length > 0 ? Object.freeze(paths) : undefined;
}

function validateInput(raw: unknown): PrepareContextInput {
  if (!raw || typeof raw !== 'object') throw new Error('Input must be an object');
  const val = raw as Record<string, unknown>;
  if (typeof val.task !== 'string' || !val.task.trim()) {
    throw new Error('Field task must be a non-empty string');
  }

  const strategy = (val.strategy === 'knowledge' || val.strategy === 'fast' || val.strategy === 'standard')
    ? val.strategy
    : undefined;

  return {
    task: val.task.trim(),
    strategy,
    budget: parseBudget(val.budget),
    explicitPaths: parseExplicitPaths(val.explicitPaths),
    maxCandidates: typeof val.maxCandidates === 'number' ? Math.min(Math.max(val.maxCandidates, 1), 50) : 10,
    enrichTopN: typeof val.enrichTopN === 'number' ? Math.max(val.enrichTopN, 1) : 5,
    tokenLimit: typeof val.tokenLimit === 'number' ? Math.max(val.tokenLimit, 1000) : 40000,
  };
}

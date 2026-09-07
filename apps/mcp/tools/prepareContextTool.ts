// apps/mcp/tools/prepareContextTool.ts
import type { McpContextContainer } from '../composition';
import type { McpPrepareContextResult } from '../types';
import { transformCandidates } from './candidateTransformer';
import { stderrLog, stderrError } from '../logger';


export const PREPARE_CONTEXT_TOOL_NAME = 'codeprep_prepare_context';

export const prepareContextToolDefinition = {
  name: PREPARE_CONTEXT_TOOL_NAME,
  description: 'Single-entry repository context preparation: discovers entry points and automatically packages context when confidence is HIGH. Returns candidates requiring selection when confidence is MEDIUM/LOW.',
  inputSchema: {
    type: 'object',
    properties: {
      task: { type: 'string', description: 'Task or bug description to prepare context for.' },
      maxCandidates: { type: 'number', description: 'Maximum candidate entry points (default: 10, max: 50).' },
      enrichTopN: { type: 'number', description: 'Top candidates to enrich with structural evidence (default: 5).' },
      tokenLimit: { type: 'number', description: 'Context budget limit in estimated tokens (default: 40000).' },
    },
    required: ['task'],
    additionalProperties: false,
  },
} as const;

export type PrepareContextInput = {
  task: string;
  maxCandidates?: number;
  enrichTopN?: number;
  tokenLimit?: number;
};

function validateInput(raw: unknown): PrepareContextInput {
  if (!raw || typeof raw !== 'object') throw new Error('Input must be an object');
  const val = raw as Record<string, unknown>;
  if (typeof val.task !== 'string' || !val.task.trim()) throw new Error('Field task must be a non-empty string');
  return {
    task: val.task.trim(),
    maxCandidates: typeof val.maxCandidates === 'number' ? Math.min(Math.max(val.maxCandidates, 1), 50) : 10,
    enrichTopN: typeof val.enrichTopN === 'number' ? Math.max(val.enrichTopN, 1) : 5,
    tokenLimit: typeof val.tokenLimit === 'number' ? Math.max(val.tokenLimit, 1000) : 40000,
  };
}

function buildPrepareResponse(res: Awaited<ReturnType<McpContextContainer['prepareContextUseCase']['execute']>>): McpPrepareContextResult {
  const dtos = transformCandidates(res.candidates);
  const p = res.contextPack;
  const pack = p ? { manifest: p.manifest, content: p.content, warnings: p.warnings } : undefined;
  stderrLog(`Prepared context: confidence=${res.confidence.level}, decision=${res.decision.decision}, packReady=${Boolean(pack)}`);
  return {
    task: res.task, candidates: dtos, confidence: res.confidence, decision: res.decision.decision,
    requiresSelection: res.decision.requiresSelection, strategy: res.decision.strategy,
    autoSelectedEntryPoints: res.decision.autoSelectedEntryPoints, contextPack: pack, warnings: p?.warnings ?? [],
  };
}

export async function handlePrepareContext(container: McpContextContainer, rawInput: unknown): Promise<McpPrepareContextResult> {
  const input = validateInput(rawInput);
  stderrLog(`Executing codeprep_prepare_context: ${input.task}`);
  try {
    const res = await container.prepareContextUseCase.execute(input);
    return buildPrepareResponse(res);
  } catch (error) {
    stderrError('Failed to prepare context', error);
    throw error;
  }
}


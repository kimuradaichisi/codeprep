// apps/mcp/tools/discoverEntryPointsTool.ts
import type { McpContextContainer } from '../composition';
import type { McpDiscoverEntryPointsResult } from '../types';
import { transformCandidates } from './candidateTransformer';
import { stderrLog, stderrError } from '../logger';
import { evaluateContextConfidence } from '../../../src/features/repository-context/domain/ContextConfidenceEvaluator';
import { resolveAdaptivePackMode } from '../../../src/features/repository-context/application/AdaptiveContextStrategy';

export const DISCOVER_ENTRY_POINTS_TOOL_NAME = 'codeprep_discover_entry_points';

export const discoverEntryPointsToolDefinition = {
  name: DISCOVER_ENTRY_POINTS_TOOL_NAME,
  description: 'Discover entry point candidates in the workspace based on the task description, enriched with native structural evidence.',
  inputSchema: {
    type: 'object',
    properties: {
      task: { type: 'string', description: 'Task or bug description to search entry points for.' },
      maxCandidates: { type: 'number', description: 'Maximum number of candidates to return (default: 10, max: 50).' },
      enrichTopN: { type: 'number', description: 'Number of top candidates to enrich with structural evidence (default: 5).' },
    },
    required: ['task'],
    additionalProperties: false,
  },
} as const;

export type DiscoverEntryPointsInput = { task: string; maxCandidates?: number; enrichTopN?: number };

function validateInput(raw: unknown): DiscoverEntryPointsInput {
  if (!raw || typeof raw !== 'object') throw new Error('Input must be an object');
  const val = raw as Record<string, unknown>;
  if (typeof val.task !== 'string' || !val.task.trim()) throw new Error('Field "task" must be a non-empty string');
  return {
    task: val.task.trim(),
    maxCandidates: typeof val.maxCandidates === 'number' ? Math.min(Math.max(val.maxCandidates, 1), 50) : 10,
    enrichTopN: typeof val.enrichTopN === 'number' ? Math.min(Math.max(val.enrichTopN, 1), 20) : 5,
  };
}

async function executeDiscovery(container: McpContextContainer, input: DiscoverEntryPointsInput): Promise<McpDiscoverEntryPointsResult> {
  const pid = container.project.id;
  const disc = await container.discoverUseCase.execute({ task: input.task, projectIds: [pid], maxCandidates: input.maxCandidates });
  const enriched = await container.enrichUseCase.execute({ task: input.task, projectIds: [pid], candidates: disc.candidates, options: { enrichTopN: input.enrichTopN } });
  const confidence = evaluateContextConfidence({ candidates: enriched });
  const suggestedPackStrategy = resolveAdaptivePackMode(confidence);
  return {
    task: input.task,
    candidates: transformCandidates(enriched),
    confidence,
    suggestedPackStrategy,
    warnings: disc.warnings.map((w) => w.message),
  };
}

export async function handleDiscoverEntryPoints(container: McpContextContainer, rawInput: unknown): Promise<McpDiscoverEntryPointsResult> {
  const input = validateInput(rawInput);
  stderrLog('Executing codeprep_discover_entry_points: ' + input.task.slice(0, 50));
  try {
    const res = await executeDiscovery(container, input);
    stderrLog('Discovered ' + res.candidates.length + ' entry point candidates');
    return res;
  } catch (error) {
    stderrError('Failed to discover entry points', error);
    throw error;
  }
}

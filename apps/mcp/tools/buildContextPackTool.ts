// apps/mcp/tools/buildContextPackTool.ts
import type { McpContextContainer } from '../composition';
import type { McpBuildContextPackResult } from '../types';
import type { DesktopContextFile } from '../../../src/features/repository-context/application/ports';
import { validateSafeRelativePaths } from '../security';
import { stderrLog, stderrError } from '../logger';

export const BUILD_CONTEXT_PACK_TOOL_NAME = 'codeprep_build_context_pack';

export const buildContextPackToolDefinition = {
  name: BUILD_CONTEXT_PACK_TOOL_NAME,
  description: 'Build a bounded task context pack for selected entry points, returning both structured manifest and packaged file contents.',
  inputSchema: {
    type: 'object',
    properties: {
      task: { type: 'string', description: 'Task or instruction for context pack.' },
      selectedEntryPoints: { type: 'array', items: { type: 'string' }, description: 'List of relative paths to entry points chosen by caller/human.' },
      tokenLimit: { type: 'number', description: 'Budget limit in estimated tokens (default: 40000).' },
    },
    required: ['task', 'selectedEntryPoints'],
    additionalProperties: false,
  },
} as const;

export type BuildContextPackInput = { task: string; selectedEntryPoints: readonly string[]; tokenLimit?: number };

async function validateInput(root: string, raw: unknown): Promise<BuildContextPackInput> {
  if (!raw || typeof raw !== 'object') throw new Error('Input must be an object');
  const val = raw as Record<string, unknown>;
  if (typeof val.task !== 'string' || !val.task.trim()) throw new Error('Field task must be a non-empty string');
  if (!Array.isArray(val.selectedEntryPoints) || val.selectedEntryPoints.length === 0) throw new Error('Field selectedEntryPoints must be a non-empty array of strings');
  const safePaths = await validateSafeRelativePaths(root, val.selectedEntryPoints as string[]);
  return {
    task: val.task.trim(),
    selectedEntryPoints: safePaths,
    tokenLimit: typeof val.tokenLimit === 'number' ? Math.max(val.tokenLimit, 1000) : 40000,
  };
}

async function loadFiles(container: McpContextContainer, relativePaths: readonly string[]): Promise<DesktopContextFile[]> {
  const files: DesktopContextFile[] = [];
  for (const rel of relativePaths) {
    const content = await container.fileContentPort.read(container.project, rel);
    if (content !== undefined) files.push({ relativePath: rel, content });
  }
  return files;
}

async function executeBuild(container: McpContextContainer, input: BuildContextPackInput): Promise<McpBuildContextPackResult> {
  const result = await container.buildContextUseCase.execute({
    taskContext: { projectId: container.project.id, task: input.task, entryPoints: input.selectedEntryPoints },
    tokenLimit: input.tokenLimit,
  });
  const includedPaths = result.manifest.entries.map((e) => e.relativePath);
  const files = await loadFiles(container, includedPaths);
  const content = container.formatter.format({ format: 'markdown', files });
  return { manifest: result.manifest, content, warnings: result.warnings.map((w) => w.message) };
}

export async function handleBuildContextPack(container: McpContextContainer, rawInput: unknown): Promise<McpBuildContextPackResult> {
  const input = await validateInput(container.project.rootPath, rawInput);
  stderrLog('Executing codeprep_build_context_pack with ' + input.selectedEntryPoints.length + ' entry points');
  try {
    const res = await executeBuild(container, input);
    stderrLog('Context pack generated: ' + res.manifest.entries.length + ' entries, within limit: ' + res.manifest.budget.withinLimit);
    return res;
  } catch (error) {
    stderrError('Failed to build context pack', error);
    throw error;
  }
}

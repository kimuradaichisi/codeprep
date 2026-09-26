/*
 * Copyright 2026 CodePrep Contributors
 */
import * as path from 'path';
import { createCliContainer } from '../composition';
import { writeCliResult, logCliProgress } from '../io/cliOutput';
import { CliError, CLI_EXIT_CODES } from '../errors/cliError';
import { validateSafeRelativePaths } from '../../mcp/security';
import type { DesktopContextFile } from '../../../src/features/repository-context/application/ports';
import type { AdaptiveStrategyOverride, AdaptivePackMode } from '../../../src/features/repository-context/domain/ContextConfidence';
import type { ContextManifest } from '../../../src/features/repository-context/domain/ContextManifest';
import type { BuildTaskContextResult } from '../../../src/features/repository-context/application/taskContextPorts';

export interface ContextPackArgs {
  readonly task?: string;
  readonly files?: readonly string[];
  readonly tokenLimit?: number;
  readonly strategy?: AdaptiveStrategyOverride;
  readonly format?: 'json' | 'markdown';
  readonly workspace?: string;
  readonly output?: string;
  readonly quiet?: boolean;
}

export interface CliPackResult {
  readonly schemaVersion: 1;
  readonly task: string;
  readonly manifest: ContextManifest;
  readonly content: string;
  readonly warnings: readonly string[];
  readonly metrics: {
    readonly candidateCount: number;
    readonly totalTokens: number;
    readonly withinLimit: boolean;
  };
}

export async function runContextPackCommand(
  args: ContextPackArgs,
  containerFactory = createCliContainer
): Promise<CliPackResult> {
  validatePackArgs(args);
  const ws = args.workspace ? path.resolve(args.workspace) : process.cwd();
  logCliProgress(`Packaging context for task: "${args.task}"`, args.quiet);
  const container = containerFactory(ws);
  const safePaths = await validateSafeRelativePaths(ws, args.files as string[]);
  const mode = resolveMode(args.strategy);
  const res = await container.buildContextUseCase.execute({
    taskContext: { projectId: container.project.id, task: args.task!, entryPoints: safePaths },
    tokenLimit: args.tokenLimit ?? 40000,
    strategy: mode,
  });
  const includedPaths = res.manifest.entries.map((e) => e.relativePath);
  const loadedFiles = await loadFiles(container, includedPaths);
  const content = container.formatter.format({ format: 'markdown', files: loadedFiles });
  const result = buildPackResult(args.task!, res, content);
  const outputText = args.format === 'markdown' ? content : JSON.stringify(result, null, 2);
  writeCliResult(outputText, { output: args.output, quiet: args.quiet });
  return result;
}

function buildPackResult(
  task: string,
  res: BuildTaskContextResult,
  content: string
): CliPackResult {
  return {
    schemaVersion: 1,
    task,
    manifest: res.manifest,
    content,
    warnings: res.warnings.map((w: { message: string }) => w.message),
    metrics: {
      candidateCount: res.manifest.entries.length,
      totalTokens: res.manifest.budget.estimatedTokens,
      withinLimit: res.manifest.budget.withinLimit,
    },
  };
}

function resolveMode(strategy?: AdaptiveStrategyOverride): AdaptivePackMode {
  if (strategy === 'fast' || strategy === 'standard' || strategy === 'expanded') {
    return strategy;
  }
  return 'standard';
}

function validatePackArgs(args: ContextPackArgs): void {
  if (!args.task || args.task.trim().length === 0) {
    throw new CliError({
      message: 'Option --task is required for context pack',
      exitCode: CLI_EXIT_CODES.INVALID_ARGUMENTS,
      errorCode: 'INVALID_ARGUMENTS',
      suggestedAction: 'codeprep context pack --task "<task>" --file "<path>"',
    });
  }
  if (!args.files || args.files.length === 0) {
    throw new CliError({
      message: 'At least one --file must be specified for context pack',
      exitCode: CLI_EXIT_CODES.INVALID_ARGUMENTS,
      errorCode: 'INVALID_ARGUMENTS',
      suggestedAction: 'codeprep context pack --task "<task>" --file "<path>"',
    });
  }
}

async function loadFiles(
  container: ReturnType<typeof createCliContainer>,
  safePaths: readonly string[]
): Promise<DesktopContextFile[]> {
  const files: DesktopContextFile[] = [];
  for (const rel of safePaths) {
    const content = await container.fileContentPort.read(container.project, rel);
    if (content !== undefined) files.push({ relativePath: rel, content });
  }
  return files;
}

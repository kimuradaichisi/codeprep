/*
 * Copyright 2026 CodePrep Contributors
 */
import { CANONICAL_COMMAND_CATALOG, COMMANDS_COMMAND_SPEC } from './catalog/commandCatalog';
import { renderGlobalHelp, renderCommandHelp } from './catalog/catalogRenderer';
import { runCommandsCommand } from './commands/commandsCommand';
import { runStatusCommand } from './commands/statusCommand';
import { runKnowledgeStatusCommand } from './commands/knowledgeCommand';
import { runContextPrepareCommand } from './commands/contextCommand';
import { runContextPackCommand } from './commands/contextPackCommand';
import { parseCliArguments } from './argumentParser';
import { CliError, CLI_EXIT_CODES, createStructuredErrorResponse, resolveExitCode } from './errors/cliError';
import { logCliError, writeCliResult } from './io/cliOutput';
import type { AdaptiveStrategyOverride } from '../../src/features/repository-context/domain/ContextConfidence';

import { CODEPREP_CLI_VERSION } from './version';
import { createCliContainer } from './composition';
import type { RepositoryContextContainer } from '../../src/features/repository-context/infrastructure/composition/RepositoryContextContainer';

export async function dispatchCli(
  argv: readonly string[],
  containerFactory: (ws: string) => RepositoryContextContainer = createCliContainer
): Promise<void> {
  const isJsonMode = detectJsonMode(argv);
  try {
    if (isVersionRequest(argv)) {
      const output = isJsonMode
        ? JSON.stringify({ version: CODEPREP_CLI_VERSION }, null, 2)
        : `codeprep ${CODEPREP_CLI_VERSION}`;
      writeCliResult(output);
      return;
    }
    if (isGlobalHelpRequest(argv)) {
      writeCliResult(renderGlobalHelp(CANONICAL_COMMAND_CATALOG));
      return;
    }
    await routeCommand(argv, containerFactory);
  } catch (err: unknown) {
    handleDispatchError(err, isJsonMode);
  }
}

async function routeCommand(
  argv: readonly string[],
  containerFactory: (ws: string) => RepositoryContextContainer
): Promise<void> {
  const [first, second] = argv;
  if (first === 'commands') {
    handleCommandsRoute(argv.slice(1));
    return;
  }
  if (first === 'status') {
    await handleStatusRoute(argv.slice(1), containerFactory);
    return;
  }
  if (first === 'knowledge') {
    await handleKnowledgeRoute(second, argv.slice(2), containerFactory);
    return;
  }
  if (first === 'context') {
    await handleContextRoute(second, argv.slice(2), containerFactory);
    return;
  }
  await handleLegacyContextFallback(argv, containerFactory);
}

function handleCommandsRoute(subArgs: readonly string[]): void {
  if (hasHelpFlag(subArgs)) {
    writeCliResult(renderCommandHelp(COMMANDS_COMMAND_SPEC));
    return;
  }
  const json = subArgs.includes('--json') || subArgs.includes('--format=json');
  const format = subArgs.includes('--format') ? subArgs[subArgs.indexOf('--format') + 1] : undefined;
  runCommandsCommand({ json, format });
}

async function handleStatusRoute(
  subArgs: readonly string[],
  containerFactory: (ws: string) => RepositoryContextContainer
): Promise<void> {
  const spec = CANONICAL_COMMAND_CATALOG.find((c) => c.name === 'status')!;
  if (hasHelpFlag(subArgs)) {
    writeCliResult(renderCommandHelp(spec));
    return;
  }
  const ws = extractOptionValue(subArgs, '--workspace', '-w');
  const fmt = extractOptionValue(subArgs, '--format');
  const out = extractOptionValue(subArgs, '--output', '-o');
  const quiet = subArgs.includes('--quiet');
  await runStatusCommand({ workspace: ws, format: fmt, output: out, quiet }, containerFactory);
}

async function handleKnowledgeRoute(
  sub: string | undefined,
  subArgs: readonly string[],
  containerFactory: (ws: string) => RepositoryContextContainer
): Promise<void> {
  const spec = CANONICAL_COMMAND_CATALOG.find((c) => c.name === 'knowledge status')!;
  if (sub === '--help' || sub === '-h' || hasHelpFlag(subArgs)) {
    writeCliResult(renderCommandHelp(spec));
    return;
  }
  if (sub !== 'status') {
    throw new CliError({
      message: `Unknown knowledge subcommand: ${sub ?? ''}`,
      exitCode: CLI_EXIT_CODES.INVALID_ARGUMENTS,
      errorCode: 'INVALID_ARGUMENTS',
      suggestedAction: 'codeprep knowledge status',
    });
  }
  const ws = extractOptionValue(subArgs, '--workspace', '-w');
  const fmt = extractOptionValue(subArgs, '--format');
  const out = extractOptionValue(subArgs, '--output', '-o');
  const quiet = subArgs.includes('--quiet');
  await runKnowledgeStatusCommand({ workspace: ws, format: fmt, output: out, quiet }, containerFactory);
}

async function handleContextRoute(
  sub: string | undefined,
  subArgs: readonly string[],
  containerFactory: (ws: string) => RepositoryContextContainer
): Promise<void> {
  if (sub === 'pack') {
    await handleContextPack(subArgs, containerFactory);
    return;
  }
  if (sub === 'prepare') {
    await handleContextPrepare(subArgs, containerFactory);
    return;
  }
  if (sub && !sub.startsWith('-')) {
    throw new CliError({
      message: `Unknown context subcommand: ${sub}`,
      exitCode: CLI_EXIT_CODES.INVALID_ARGUMENTS,
      errorCode: 'INVALID_ARGUMENTS',
      suggestedAction: 'codeprep context prepare --help',
    });
  }
  const rest = sub ? [sub, ...subArgs] : subArgs;
  await handleContextPrepare(rest, containerFactory);
}

async function handleContextPrepare(
  args: readonly string[],
  containerFactory: (ws: string) => RepositoryContextContainer
): Promise<void> {
  const spec = CANONICAL_COMMAND_CATALOG.find((c) => c.name === 'context prepare')!;
  if (hasHelpFlag(args)) {
    writeCliResult(renderCommandHelp(spec));
    return;
  }
  const parsed = parseCliArguments(args);
  await runContextPrepareCommand(parsed, containerFactory);
}

async function handleContextPack(
  args: readonly string[],
  containerFactory: (ws: string) => RepositoryContextContainer
): Promise<void> {
  const spec = CANONICAL_COMMAND_CATALOG.find((c) => c.name === 'context pack')!;
  if (hasHelpFlag(args)) {
    writeCliResult(renderCommandHelp(spec));
    return;
  }
  const task = extractOptionValue(args, '--task');
  const files = extractRepeatedOptionValues(args, '--file', '-f');
  const tokenLimitStr = extractOptionValue(args, '--token-limit');
  const strategy = extractOptionValue(args, '--strategy');
  const format = extractOptionValue(args, '--format') as 'json' | 'markdown' | undefined;
  const workspace = extractOptionValue(args, '--workspace', '-w');
  const output = extractOptionValue(args, '--output', '-o');
  const quiet = args.includes('--quiet');
  await runContextPackCommand({
    task,
    files,
    tokenLimit: tokenLimitStr ? Number(tokenLimitStr) : undefined,
    strategy: strategy as AdaptiveStrategyOverride | undefined,
    format,
    workspace,
    output,
    quiet,
  }, containerFactory);
}

async function handleLegacyContextFallback(
  argv: readonly string[],
  containerFactory: (ws: string) => RepositoryContextContainer
): Promise<void> {
  const parsed = parseCliArguments(argv);
  await runContextPrepareCommand(parsed, containerFactory);
}

function handleDispatchError(err: unknown, isJsonMode: boolean): void {
  const exitCode = resolveExitCode(err);
  if (isJsonMode) {
    const errorPayload = createStructuredErrorResponse(err);
    process.stdout.write(JSON.stringify(errorPayload, null, 2) + '\n');
  } else {
    const message = err instanceof Error ? err.message : String(err);
    logCliError(message);
  }
  process.exitCode = exitCode;
}

function detectJsonMode(argv: readonly string[]): boolean {
  if (argv.includes('--json') || argv.includes('--format=json')) return true;
  const fmtIdx = argv.indexOf('--format');
  if (fmtIdx !== -1 && argv[fmtIdx + 1] === 'json') return true;
  return process.env.npm_config_format === 'json';
}

function isGlobalHelpRequest(argv: readonly string[]): boolean {
  return argv.length === 0 || (argv.length === 1 && hasHelpFlag(argv));
}

function isVersionRequest(argv: readonly string[]): boolean {
  return argv.includes('--version') || argv.includes('-v');
}

function hasHelpFlag(args: readonly string[]): boolean {
  return args.includes('--help') || args.includes('-h');
}

function extractOptionValue(args: readonly string[], flag: string, alias?: string): string | undefined {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag || (alias && args[i] === alias)) {
      return args[i + 1];
    }
    if (args[i].startsWith(`${flag}=`)) {
      return args[i].slice(flag.length + 1);
    }
  }
  return undefined;
}

function extractRepeatedOptionValues(args: readonly string[], flag: string, alias?: string): string[] {
  const res: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === flag || (alias && args[i] === alias)) && i + 1 < args.length) {
      res.push(args[i + 1]);
    } else if (args[i].startsWith(`${flag}=`)) {
      res.push(args[i].slice(flag.length + 1));
    }
  }
  return res;
}

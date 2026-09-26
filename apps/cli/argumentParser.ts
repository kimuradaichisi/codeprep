/*
 * Copyright 2026 CodePrep Contributors
 */
import * as fs from 'fs';
import * as path from 'path';
import type { ContextRequest } from '../../src/features/repository-context/domain/request/ContextRequest';
import { CliRequestParser, type RawRequestOptions } from './cliRequestParser';

export interface CliArguments {
  readonly task: string;
  readonly request?: ContextRequest;
  readonly workspace: string;
  readonly format: 'json' | 'markdown';
  readonly pack: boolean;
  readonly projection?: boolean;
  readonly output?: string;
  readonly strategy?: 'knowledge' | 'standard' | 'fast';
  readonly maxFiles?: number;
  readonly maxTokens?: number;
  readonly explicitPaths?: readonly string[];
  readonly stdin?: boolean;
  readonly quiet?: boolean;
}

type RawOptions = RawRequestOptions & {
  taskFile?: string;
  workspace?: string;
  format?: string;
  pack?: boolean;
  projection?: boolean;
  output?: string;
  strategy?: string;
  maxFiles?: number;
  maxTokens?: number;
  explicitPaths?: string[];
  stdin?: boolean;
  quiet?: boolean;
};

export function parseCliArguments(argv: readonly string[], env: NodeJS.ProcessEnv = process.env): CliArguments {
  const raw = parseArgv(argv, env);
  if (raw.task && raw.taskFile) {
    throw new Error('Cannot specify both --task and --task-file');
  }
  if (raw.stdin && (raw.task || raw.taskFile)) {
    throw new Error('Cannot specify --stdin together with --task or --task-file');
  }
  const taskFallback = raw.stdin ? readStdin() : raw.taskFile ? readTaskFile(raw.taskFile) : undefined;
  const request = CliRequestParser.parse(raw, taskFallback);
  const task = request.goal;
  const workspace = raw.workspace ? path.resolve(raw.workspace) : process.cwd();
  const format = resolveFormat(raw.format);
  const strategy = resolveStrategy(raw.strategy);

  return Object.freeze({
    task,
    request,
    workspace,
    format,
    pack: Boolean(raw.pack),
    projection: Boolean(raw.projection),
    output: raw.output ? path.resolve(raw.output) : undefined,
    strategy,
    maxFiles: raw.maxFiles,
    maxTokens: raw.maxTokens,
    explicitPaths: raw.explicitPaths ? Object.freeze(raw.explicitPaths) : undefined,
    stdin: Boolean(raw.stdin),
    quiet: Boolean(raw.quiet),
  });
}

function parseArgv(argv: readonly string[], env: NodeJS.ProcessEnv): RawOptions {
  const options: RawOptions = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const consumed = parseOptionAt(argv, i, options);
    if (consumed > 0) i += consumed - 1;
    else if (!argv[i].startsWith('-')) positional.push(argv[i]);
  }
  applyEnvFallback(options, env);
  resolvePositionalFallback(positional, options);
  return options;
}

function resolvePositionalFallback(positional: string[], opt: RawOptions): void {
  const remaining: string[] = [];
  for (const item of positional) {
    if (!opt.format && (item === 'json' || item === 'markdown')) {
      opt.format = item;
    } else if (!opt.strategy && (item === 'knowledge' || item === 'standard' || item === 'fast')) {
      opt.strategy = item;
    } else {
      remaining.push(item);
    }
  }
  if (!opt.task && !opt.goal && remaining.length > 0) {
    opt.task = remaining.join(' ');
  }
}

function applyEnvFallback(opt: RawOptions, env: NodeJS.ProcessEnv): void {
  if (!opt.task && env.npm_config_task && env.npm_config_task !== 'true') opt.task = env.npm_config_task;
  if (!opt.goal && env.npm_config_goal && env.npm_config_goal !== 'true') opt.goal = env.npm_config_goal;
  if (!opt.taskFile && env.npm_config_task_file) opt.taskFile = env.npm_config_task_file;
  if (!opt.workspace && env.npm_config_workspace) opt.workspace = env.npm_config_workspace;
  if (!opt.format && env.npm_config_format) opt.format = env.npm_config_format;
  if (!opt.pack && (env.npm_config_pack === 'true' || env.npm_config_pack === '')) opt.pack = true;
  if (!opt.output && env.npm_config_output) opt.output = env.npm_config_output;
  if (!opt.strategy && env.npm_config_strategy && env.npm_config_strategy !== 'true') {
    opt.strategy = env.npm_config_strategy;
  }
  if (!opt.maxFiles && env.npm_config_max_files) opt.maxFiles = Number(env.npm_config_max_files);
  if (!opt.maxTokens && env.npm_config_max_tokens) opt.maxTokens = Number(env.npm_config_max_tokens);
  if (!opt.stdin && (env.npm_config_stdin === 'true' || env.npm_config_stdin === '')) opt.stdin = true;
  if (!opt.quiet && (env.npm_config_quiet === 'true' || env.npm_config_quiet === '')) opt.quiet = true;
}

function parseOptionAt(argv: readonly string[], i: number, opt: RawOptions): number {
  const a = argv[i];
  if (a === '--task' && i + 1 < argv.length) { opt.task = argv[i + 1]; return 2; }
  if (a.startsWith('--task=')) { opt.task = a.slice(7); return 1; }
  if (a === '--goal' && i + 1 < argv.length) { opt.goal = argv[i + 1]; return 2; }
  if (a.startsWith('--goal=')) { opt.goal = a.slice(7); return 1; }
  if (a === '--task-file' && i + 1 < argv.length) { opt.taskFile = argv[i + 1]; return 2; }
  if (a.startsWith('--task-file=')) { opt.taskFile = a.slice(12); return 1; }
  return parseOptionAtSecondary(argv, i, opt);
}

function parseOptionAtSecondary(argv: readonly string[], i: number, opt: RawOptions): number {
  const a = argv[i];
  if (a === '--intent' && i + 1 < argv.length) { opt.intent = argv[i + 1]; return 2; }
  if (a.startsWith('--intent=')) { opt.intent = a.slice(9); return 1; }
  if (a === '--scope' && i + 1 < argv.length) { opt.scope = argv[i + 1]; return 2; }
  if (a.startsWith('--scope=')) { opt.scope = a.slice(8); return 1; }
  if (a === '--scope-target' && i + 1 < argv.length) { opt.scopeTarget = argv[i + 1]; return 2; }
  if (a.startsWith('--scope-target=')) { opt.scopeTarget = a.slice(15); return 1; }
  if ((a === '--file' || a === '--anchor-file') && i + 1 < argv.length) {
    opt.fileAnchors = opt.fileAnchors ?? [];
    opt.fileAnchors.push(argv[i + 1]);
    return 2;
  }
  return parseOptionAtTertiary(argv, i, opt);
}

function parseOptionAtTertiary(argv: readonly string[], i: number, opt: RawOptions): number {
  const a = argv[i];
  if (a.startsWith('--file=') || a.startsWith('--anchor-file=')) {
    opt.fileAnchors = opt.fileAnchors ?? [];
    opt.fileAnchors.push(a.split('=')[1]);
    return 1;
  }
  if ((a === '--symbol' || a === '--anchor-symbol') && i + 1 < argv.length) {
    opt.symbolAnchors = opt.symbolAnchors ?? [];
    opt.symbolAnchors.push(argv[i + 1]);
    return 2;
  }
  if (a.startsWith('--symbol=') || a.startsWith('--anchor-symbol=')) {
    opt.symbolAnchors = opt.symbolAnchors ?? [];
    opt.symbolAnchors.push(a.split('=')[1]);
    return 1;
  }
  return parseOptionAtQuaternary(argv, i, opt);
}

function parseOptionAtQuaternary(argv: readonly string[], i: number, opt: RawOptions): number {
  const a = argv[i];
  if ((a === '--workspace' || a === '-w') && i + 1 < argv.length) { opt.workspace = argv[i + 1]; return 2; }
  if (a.startsWith('--workspace=')) { opt.workspace = a.slice(12); return 1; }
  if (a === '--format' && i + 1 < argv.length) { opt.format = argv[i + 1]; return 2; }
  if (a.startsWith('--format=')) { opt.format = a.slice(9); return 1; }
  if (a === '--strategy' && i + 1 < argv.length) { opt.strategy = argv[i + 1]; return 2; }
  if (a.startsWith('--strategy=')) { opt.strategy = a.slice(11); return 1; }
  if (a === '--pack') { opt.pack = true; return 1; }
  if (a === '--projection') { opt.projection = true; return 1; }
  if ((a === '--output' || a === '-o') && i + 1 < argv.length) { opt.output = argv[i + 1]; return 2; }
  if (a.startsWith('--output=')) { opt.output = a.slice(9); return 1; }
  return parseOptionAtQuinary(argv, i, opt);
}

function parseOptionAtQuinary(argv: readonly string[], i: number, opt: RawOptions): number {
  const a = argv[i];
  if (a === '--max-files' && i + 1 < argv.length) { opt.maxFiles = Number(argv[i + 1]); return 2; }
  if (a.startsWith('--max-files=')) { opt.maxFiles = Number(a.slice(12)); return 1; }
  if (a === '--max-tokens' && i + 1 < argv.length) { opt.maxTokens = Number(argv[i + 1]); return 2; }
  if (a.startsWith('--max-tokens=')) { opt.maxTokens = Number(a.slice(13)); return 1; }
  if (a === '--explicit-path' && i + 1 < argv.length) {
    opt.explicitPaths = opt.explicitPaths ?? [];
    opt.explicitPaths.push(argv[i + 1]);
    return 2;
  }
  if (a.startsWith('--explicit-path=')) {
    opt.explicitPaths = opt.explicitPaths ?? [];
    opt.explicitPaths.push(a.slice(16));
    return 1;
  }
  if (a === '--stdin') { opt.stdin = true; return 1; }
  if (a === '--quiet') { opt.quiet = true; return 1; }
  return 0;
}

function readStdin(): string {
  try {
    return fs.readFileSync(0, 'utf-8').trim();
  } catch (err) {
    throw new Error('Failed to read from standard input: ' + (err instanceof Error ? err.message : String(err)));
  }
}

function readTaskFile(filePath: string): string {
  const p = path.resolve(filePath);
  if (!fs.existsSync(p)) throw new Error(`Task file not found: ${p}`);
  return fs.readFileSync(p, 'utf-8').trim();
}

function resolveFormat(format?: string): 'json' | 'markdown' {
  if (!format || format === 'json') return 'json';
  if (format === 'markdown') return 'markdown';
  throw new Error(`Invalid format: ${format}. Supported formats are 'json' or 'markdown'`);
}

function resolveStrategy(strat?: string): 'knowledge' | 'standard' | 'fast' | undefined {
  if (!strat) return undefined;
  if (strat === 'knowledge' || strat === 'standard' || strat === 'fast') return strat;
  throw new Error(`Invalid strategy: ${strat}. Supported strategies are 'knowledge', 'standard', 'fast'`);
}

/*
 * Copyright 2026 CodePrep Contributors
 */
import type { CliCommandSpec, CliExitCodeSpec, CliOptionSpec, CliOutputFormat } from './cliSpec';
import { CLI_EXIT_CODES } from '../errors/cliError';

export const TEXT_JSON_FORMATS: readonly CliOutputFormat[] = Object.freeze(['text', 'json']);
export const JSON_TEXT_FORMATS: readonly CliOutputFormat[] = Object.freeze(['json', 'text']);
export const JSON_MARKDOWN_FORMATS: readonly CliOutputFormat[] = Object.freeze(['json', 'markdown']);

export const COMMON_EXIT_CODES: readonly CliExitCodeSpec[] = Object.freeze([
  { code: CLI_EXIT_CODES.SUCCESS, meaning: 'SUCCESS', description: 'Command executed successfully.' },
  { code: CLI_EXIT_CODES.UNEXPECTED_FAILURE, meaning: 'UNEXPECTED_FAILURE', description: 'Internal runtime error or unhandled exception.' },
  { code: CLI_EXIT_CODES.INVALID_ARGUMENTS, meaning: 'INVALID_ARGUMENTS', description: 'Missing required options or invalid argument values.' },
  { code: CLI_EXIT_CODES.REPOSITORY_UNAVAILABLE, meaning: 'REPOSITORY_UNAVAILABLE', description: 'Target workspace directory not found or unreadable.' },
]);

export const CONTEXT_EXIT_CODES: readonly CliExitCodeSpec[] = Object.freeze([
  ...COMMON_EXIT_CODES,
  { code: CLI_EXIT_CODES.KNOWLEDGE_MISSING, meaning: 'KNOWLEDGE_MISSING', description: 'Knowledge database not found when strategy="knowledge" requested.' },
  { code: CLI_EXIT_CODES.KNOWLEDGE_STALE, meaning: 'KNOWLEDGE_STALE', description: 'Knowledge snapshot is stale or needs refresh.' },
  { code: CLI_EXIT_CODES.ENTITY_NOT_FOUND, meaning: 'ENTITY_NOT_FOUND', description: 'Specified file or symbol anchor could not be located.' },
]);

const COMMANDS_OPTIONS: readonly CliOptionSpec[] = Object.freeze([
  { name: '--json', type: 'boolean', description: 'Output machine-readable catalog as structured JSON (alias for --format json).' },
  { name: '--format', type: 'string', description: 'Output format (json, text).', choices: ['json', 'text'], defaultValue: 'text' },
]);

export const COMMANDS_COMMAND_SPEC: CliCommandSpec = Object.freeze({
  name: 'commands',
  path: Object.freeze(['commands']),
  summary: 'List all available CodePrep CLI commands and their canonical metadata.',
  description: 'Self-discovery interface for AI agents and human operators. Can output formatted terminal table or structured JSON.',
  category: 'system',
  options: COMMANDS_OPTIONS,
  outputFormats: TEXT_JSON_FORMATS,
  defaultFormat: 'text',
  exitCodes: COMMON_EXIT_CODES,
  examples: Object.freeze([
    { description: 'Discover all commands as JSON for automated agent planning', command: 'codeprep commands --json' },
    { description: 'View human-readable command list', command: 'codeprep commands' },
  ]),
});

const STATUS_OPTIONS: readonly CliOptionSpec[] = Object.freeze([
  { name: '--workspace', alias: '-w', type: 'string', description: 'Target workspace root directory (default: current directory).' },
  { name: '--format', type: 'string', description: 'Output format (json, text).', choices: ['json', 'text'], defaultValue: 'json' },
  { name: '--output', alias: '-o', type: 'string', description: 'File path to save the output.' },
  { name: '--quiet', type: 'boolean', description: 'Suppress non-essential progress output on stderr.' },
]);

export const STATUS_COMMAND_SPEC: CliCommandSpec = Object.freeze({
  name: 'status',
  path: Object.freeze(['status']),
  summary: 'Inspect workspace binding, repository scan, knowledge index, and semantic index state.',
  description: 'Validates repository accessibility and reports readiness of structural/semantic knowledge stores. Parity with MCP codeprep_workspace_status.',
  category: 'repository',
  options: STATUS_OPTIONS,
  outputFormats: JSON_TEXT_FORMATS,
  defaultFormat: 'json',
  exitCodes: COMMON_EXIT_CODES,
  examples: Object.freeze([
    { description: 'Check workspace readiness as JSON', command: 'codeprep status' },
    { description: 'Check workspace readiness as plain text', command: 'codeprep status --format text' },
  ]),
  mcpEquivalent: 'codeprep_workspace_status',
  sharedUseCase: 'checkMcpStatus',
});

const KNOWLEDGE_STATUS_OPTIONS: readonly CliOptionSpec[] = Object.freeze([
  { name: '--workspace', alias: '-w', type: 'string', description: 'Target workspace root directory (default: current directory).' },
  { name: '--format', type: 'string', description: 'Output format (json, text).', choices: ['json', 'text'], defaultValue: 'json' },
  { name: '--output', alias: '-o', type: 'string', description: 'File path to save the output.' },
  { name: '--quiet', type: 'boolean', description: 'Suppress stderr diagnostics.' },
]);

export const KNOWLEDGE_STATUS_COMMAND_SPEC: CliCommandSpec = Object.freeze({
  name: 'knowledge status',
  path: Object.freeze(['knowledge', 'status']),
  summary: 'Inspect knowledge graph store statistics and snapshot details.',
  description: 'Reports SQLite knowledge database presence, node count, relation count, and snapshot metadata.',
  category: 'knowledge',
  options: KNOWLEDGE_STATUS_OPTIONS,
  outputFormats: JSON_TEXT_FORMATS,
  defaultFormat: 'json',
  exitCodes: COMMON_EXIT_CODES,
  examples: Object.freeze([
    { description: 'Inspect knowledge DB status', command: 'codeprep knowledge status' },
  ]),
  sharedUseCase: 'SqliteRepositoryKnowledgeStore',
});

const CONTEXT_PREPARE_OPTIONS: readonly CliOptionSpec[] = Object.freeze([
  { name: '--task', type: 'string', description: 'Task or bug description (required unless --task-file or --stdin is used).' },
  { name: '--task-file', type: 'string', description: 'Path to a file containing the task description.' },
  { name: '--goal', type: 'string', description: 'Explicit goal description (synonym for --task).' },
  { name: '--stdin', type: 'boolean', description: 'Read task description from standard input.' },
  { name: '--format', type: 'string', description: 'Output format (json, markdown).', choices: ['json', 'markdown'], defaultValue: 'json' },
  { name: '--strategy', type: 'string', description: 'Preparation strategy (knowledge, standard, fast).', choices: ['knowledge', 'standard', 'fast'] },
  { name: '--pack', type: 'boolean', description: 'Include packed file contents alongside candidate metadata.' },
  { name: '--projection', type: 'boolean', description: 'Output structured ContextProjection (when strategy=knowledge).' },
  { name: '--intent', type: 'string', description: 'Context intent mode.', choices: ['change', 'review', 'understand', 'impact', 'investigate', 'document', 'test'], defaultValue: 'change' },
  { name: '--scope', type: 'string', description: 'Scope restriction (auto, repo, dir, file, feature).', defaultValue: 'auto' },
  { name: '--scope-target', type: 'string', description: 'Target path or feature name for scoped searches.' },
  { name: '--file', alias: '--anchor-file', type: 'string', description: 'Anchor file path (can be specified multiple times).' },
  { name: '--symbol', alias: '--anchor-symbol', type: 'string', description: 'Anchor symbol name (can be specified multiple times).' },
  { name: '--max-files', type: 'number', description: 'Maximum number of candidate files to return.' },
  { name: '--max-tokens', type: 'number', description: 'Budget token limit for packaged content.' },
  { name: '--workspace', alias: '-w', type: 'string', description: 'Target workspace root directory.' },
  { name: '--output', alias: '-o', type: 'string', description: 'Write output directly to file path.' },
  { name: '--quiet', type: 'boolean', description: 'Suppress non-essential progress output on stderr.' },
]);

export const CONTEXT_PREPARE_COMMAND_SPEC: CliCommandSpec = Object.freeze({
  name: 'context prepare',
  path: Object.freeze(['context', 'prepare']),
  summary: 'Prepare task-oriented context (Context Projection, Context Pack v2, or candidate entry points).',
  description: 'Primary agent context entry point. Analyzes task goals, scores relevant repository files, and generates structured context.',
  category: 'context',
  options: CONTEXT_PREPARE_OPTIONS,
  outputFormats: JSON_MARKDOWN_FORMATS,
  defaultFormat: 'json',
  exitCodes: CONTEXT_EXIT_CODES,
  examples: Object.freeze([
    { description: 'Prepare context for a change task in JSON', command: 'codeprep context prepare --task "Fix payment retry policy"' },
    { description: 'Prepare context using knowledge subgraph projection', command: 'codeprep context prepare --task "Optimize checkout" --strategy knowledge --projection' },
    { description: 'Prepare context via pipeline from stdin', command: 'echo "Add validation to user auth" | codeprep context prepare --stdin' },
  ]),
  legacyAliases: Object.freeze([Object.freeze(['context'])]),
  mcpEquivalent: 'codeprep_prepare_context',
  sharedUseCase: 'PrepareContextProjectionUseCase',
});

const CONTEXT_PACK_OPTIONS: readonly CliOptionSpec[] = Object.freeze([
  { name: '--task', type: 'string', required: true, description: 'Task or bug description.' },
  { name: '--file', alias: '-f', type: 'string', required: true, description: 'Relative path of file to pack (can be specified multiple times).' },
  { name: '--token-limit', type: 'number', description: 'Token budget for context pack (default: 40000).' },
  { name: '--strategy', type: 'string', description: 'Packaging strategy (auto, fast, standard, expanded).', choices: ['auto', 'fast', 'standard', 'expanded'], defaultValue: 'auto' },
  { name: '--format', type: 'string', description: 'Output format (json, markdown).', choices: ['json', 'markdown'], defaultValue: 'json' },
  { name: '--workspace', alias: '-w', type: 'string', description: 'Target workspace root directory.' },
  { name: '--output', alias: '-o', type: 'string', description: 'Write output directly to file path.' },
  { name: '--quiet', type: 'boolean', description: 'Suppress non-essential progress output on stderr.' },
]);

export const CONTEXT_PACK_COMMAND_SPEC: CliCommandSpec = Object.freeze({
  name: 'context pack',
  path: Object.freeze(['context', 'pack']),
  summary: 'Build a bounded task context pack for specified file entry points.',
  description: 'Packages specified files with dependencies and budgets into a structured context bundle. Parity with MCP codeprep_build_context_pack.',
  category: 'context',
  options: CONTEXT_PACK_OPTIONS,
  outputFormats: JSON_MARKDOWN_FORMATS,
  defaultFormat: 'json',
  exitCodes: COMMON_EXIT_CODES,
  examples: Object.freeze([
    { description: 'Build context pack for explicit files', command: 'codeprep context pack --task "Refactor checkout" --file src/checkout.ts' },
  ]),
  mcpEquivalent: 'codeprep_build_context_pack',
  sharedUseCase: 'BuildTaskContextUseCase',
});

export const CANONICAL_COMMAND_CATALOG: readonly CliCommandSpec[] = Object.freeze([
  COMMANDS_COMMAND_SPEC,
  STATUS_COMMAND_SPEC,
  KNOWLEDGE_STATUS_COMMAND_SPEC,
  CONTEXT_PREPARE_COMMAND_SPEC,
  CONTEXT_PACK_COMMAND_SPEC,
]);

/*
 * Copyright 2026 CodePrep Contributors
 */
import type { CliCommandSpec, CliOptionSpec } from './cliSpec';

export function renderCliReferenceMarkdown(commands: readonly CliCommandSpec[]): string {
  const lines: string[] = [
    ...renderReferenceHeader(),
    ...renderSummaryTable(commands),
    '', '---', '', '## Detailed Command Specifications', '',
  ];
  for (const cmd of commands) {
    lines.push(...renderSingleCommandDoc(cmd));
  }
  return lines.join('\n');
}

function renderReferenceHeader(): string[] {
  return [
    '# CodePrep CLI Reference',
    '',
    '> **NOTE:** This document is automatically generated from the Canonical Command Catalog.',
    '> Do not edit manually. Run `npm run cli:docs` to regenerate, or `npm run cli:docs:check` to verify.',
    '',
    '## Recommended Agent Flow',
    '',
    'When an AI Agent starts working on a task in a workspace, follow this standard sequential pattern:',
    '',
    ...renderAgentFlowSnippet(),
    '',
    '---',
    '',
    '## Command Catalog Summary',
    '',
    '| Command | Category | Purpose | MCP Equivalent |',
    '| :--- | :--- | :--- | :--- |',
  ];
}

function renderAgentFlowSnippet(): string[] {
  return [
    '```bash',
    '# 1. Discover available commands and capabilities',
    'codeprep commands --json',
    '',
    '# 2. Inspect workspace binding and index readiness',
    'codeprep status --format json',
    '',
    '# 3. Check knowledge base statistics if using graph features',
    'codeprep knowledge status --format json',
    '',
    '# 4. Prepare task-specific context projection or candidates',
    'codeprep context prepare --task "<your task description>" --format json',
    '',
    '# 5. (Optional) Build bounded context pack for selected files',
    'codeprep context pack --task "<task>" --file "<file1>" --file "<file2>" --format json',
    '```',
  ];
}

function renderSummaryTable(commands: readonly CliCommandSpec[]): string[] {
  const rows: string[] = [];
  for (const cmd of commands) {
    const mcp = cmd.mcpEquivalent ? `\`${cmd.mcpEquivalent}\`` : '-';
    rows.push(`| \`codeprep ${cmd.name}\` | \`${cmd.category}\` | ${cmd.summary} | ${mcp} |`);
  }
  return rows;
}

function renderSingleCommandDoc(cmd: CliCommandSpec): string[] {
  const lines: string[] = [
    `### \`codeprep ${cmd.name}\``,
    '',
    `**Purpose:** ${cmd.summary}`,
    '',
    cmd.description ? `${cmd.description}\n` : '',
    `**Syntax:** \`codeprep ${cmd.name} [options]\``,
    '',
    `**Category:** \`${cmd.category}\``,
    `**Default Output Format:** \`${cmd.defaultFormat}\` (Supported: ${cmd.outputFormats.map((f) => `\`${f}\``).join(', ')})`,
  ];

  if (cmd.mcpEquivalent) {
    lines.push(`**MCP Equivalent:** \`${cmd.mcpEquivalent}\` (Shared UseCase: \`${cmd.sharedUseCase ?? 'N/A'}\`)`);
  }
  if (cmd.legacyAliases && cmd.legacyAliases.length > 0) {
    const aliasStr = cmd.legacyAliases.map((a) => `\`codeprep ${a.join(' ')}\``).join(', ');
    lines.push(`**Legacy Aliases:** ${aliasStr}`);
  }

  lines.push('', '#### Options', '', renderOptionsTable(cmd.options), '');
  lines.push('#### Exit Codes', '', renderExitCodesTable(cmd.exitCodes), '');

  if (cmd.examples.length > 0) {
    lines.push('#### Examples', '', ...renderExamples(cmd.examples), '');
  }

  lines.push('---', '');
  return lines;
}

function renderOptionsTable(options: readonly CliOptionSpec[]): string {
  if (options.length === 0) return '_No specific options._';
  const rows: string[] = [
    '| Option | Type | Default | Description |',
    '| :--- | :--- | :--- | :--- |',
  ];
  for (const opt of options) {
    const nameWithAlias = opt.alias ? `\`${opt.name}\`, \`${opt.alias}\`` : `\`${opt.name}\``;
    const req = opt.required ? ' **(required)**' : '';
    const def = opt.defaultValue !== undefined ? `\`${String(opt.defaultValue)}\`` : '-';
    rows.push(`| ${nameWithAlias}${req} | \`${opt.type}\` | ${def} | ${opt.description} |`);
  }
  return rows.join('\n');
}

function renderExitCodesTable(exitCodes: CliCommandSpec['exitCodes']): string {
  const rows: string[] = [
    '| Code | Meaning | Description |',
    '| :--- | :--- | :--- |',
  ];
  for (const c of exitCodes) {
    rows.push(`| \`${c.code}\` | \`${c.meaning}\` | ${c.description} |`);
  }
  return rows.join('\n');
}

function renderExamples(examples: CliCommandSpec['examples']): string[] {
  const out: string[] = [];
  for (const eg of examples) {
    out.push(`- **${eg.description}**:`);
    out.push('  ```bash', `  ${eg.command}`, '  ```');
  }
  return out;
}

export function renderGlobalHelp(commands: readonly CliCommandSpec[]): string {
  const parts: string[] = [
    'CodePrep prepares repository context for coding agents.',
    '',
    'Usage: codeprep <command> [subcommand] [options]',
    '',
    'Typical flow:',
    '  codeprep status --format json',
    '  codeprep context prepare --task "<task>" --format json',
    '',
    'Commands:',
    ...renderCommandsList(commands),
    '',
    'Global Options:',
    '  --help, -h             Show help information',
    '  --version, -v          Show version number',
    '',
    'Discover all commands:',
    '  codeprep commands --json',
    '  codeprep <command> --help',
  ];
  return parts.join('\n');
}

function renderCommandsList(commands: readonly CliCommandSpec[]): string[] {
  return commands.map((cmd) => `  ${cmd.name.padEnd(22, ' ')} ${cmd.summary}`);
}

export function renderCommandHelp(cmd: CliCommandSpec): string {
  const parts: string[] = [
    `Usage: codeprep ${cmd.name} [options]`,
    '',
    cmd.summary,
  ];
  if (cmd.description) parts.push('', cmd.description);
  parts.push('', 'Options:');
  for (const opt of cmd.options) {
    const optLabel = opt.alias ? `${opt.name}, ${opt.alias}` : opt.name;
    const pad = optLabel.padEnd(24, ' ');
    parts.push(`  ${pad} ${opt.description}`);
  }
  if (cmd.examples.length > 0) {
    parts.push('', 'Examples:');
    for (const eg of cmd.examples) {
      parts.push(`  # ${eg.description}`, `  ${eg.command}`);
    }
  }
  return parts.join('\n');
}

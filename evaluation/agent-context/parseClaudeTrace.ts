// evaluation/agent-context/parseClaudeTrace.ts
import type { FailureClass, ParsedToolEvent, TaskDefinition, ToolCallKind, TrialCondition } from './types';

export type ClaudeUsageMetrics = Readonly<{
  durationMs: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
}>;

function classifyBashCommand(cmd: string): ToolCallKind {
  const c = cmd.toLowerCase().trim();
  if (c.startsWith('git') || c.includes('git status') || c.includes('git diff')) return 'git';
  if (c.startsWith('rg') || c.startsWith('grep') || c.includes('find')) return 'search';
  if (c.startsWith('ls') || c.startsWith('dir')) return 'list';
  if (c.startsWith('cat') || c.startsWith('head') || c.startsWith('tail')) return 'read';
  if (c.includes('vitest') || c.includes('npm run test') || c.includes('check')) return 'test';
  return 'other';
}

function classifyTool(name: string, input: Record<string, unknown>): { kind: ToolCallKind; target?: string } {
  if (name.includes('codeprep')) return { kind: 'mcp' };
  if (name === 'Read') return { kind: 'read', target: String(input.file_path || '') };
  if (name === 'Edit' || name === 'Write') return { kind: 'edit', target: String(input.file_path || '') };
  if (name === 'Glob' || name === 'Grep') return { kind: 'search', target: String(input.pattern || '') };
  if (name === 'Bash') {
    const cmd = String(input.command || '');
    return { kind: classifyBashCommand(cmd), target: cmd.split(/\s+/).pop() };
  }
  return { kind: 'other' };
}

type ParseCtx = { seq: number; hasEdited: boolean; hasPacked: boolean };

function parseSingleBlock(b: unknown, ctx: ParseCtx): ParsedToolEvent | undefined {
  const block = b as Record<string, unknown>;
  if (block?.type !== 'tool_use') return undefined;
  const name = String(block.name || '');
  const input = (block.input as Record<string, unknown>) || {};
  const { kind, target } = classifyTool(name, input);
  if (kind === 'edit') ctx.hasEdited = true;
  if (name.includes('build_context_pack')) ctx.hasPacked = true;
  return {
    sequence: ++ctx.seq, kind, toolName: name, target,
    isBeforeFirstEdit: !ctx.hasEdited, isPostPack: ctx.hasPacked && !ctx.hasEdited,
  };
}

function parseBlocks(blocks: readonly unknown[], ctx: ParseCtx): ParsedToolEvent[] {
  const events: ParsedToolEvent[] = [];
  for (const b of blocks) {
    const ev = parseSingleBlock(b, ctx);
    if (ev) events.push(ev);
  }
  return events;
}

function parseLine(line: string, ctx: ParseCtx): ParsedToolEvent[] {
  if (!line.trim().startsWith('{')) return [];
  try {
    const obj = JSON.parse(line) as Record<string, unknown>;
    const content = (obj?.message as Record<string, unknown>)?.content;
    return Array.isArray(content) ? parseBlocks(content, ctx) : [];
  } catch {
    return [];
  }
}

export function parseClaudeEvents(lines: readonly string[]): readonly ParsedToolEvent[] {
  const ctx: ParseCtx = { seq: 0, hasEdited: false, hasPacked: false };
  return lines.flatMap((line) => parseLine(line, ctx));
}

function parseResultMetrics(obj: Record<string, unknown>): ClaudeUsageMetrics {
  const usage = (obj.usage as Record<string, unknown>) || {};
  return {
    durationMs: Number(obj.duration_ms || 0),
    costUsd: Number(obj.total_cost_usd || 0),
    inputTokens: Number(usage.input_tokens || 0),
    outputTokens: Number(usage.output_tokens || 0),
    cacheReadTokens: Number(usage.cache_read_input_tokens || 0),
  };
}

export function extractClaudeMetrics(lines: readonly string[]): ClaudeUsageMetrics {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line.startsWith('{"type":"result"') && !line.includes('"type":"result"')) continue;
    try {
      const obj = JSON.parse(line) as Record<string, unknown>;
      if (obj.type === 'result') return parseResultMetrics(obj);
    } catch {
      // ignore
    }
  }
  return { durationMs: 0, costUsd: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };
}

export function determineFailureClass(p: {
  passed: boolean;
  isCompliant: boolean;
  timedOut: boolean;
  entryPointIdentified: boolean;
  condition: TrialCondition;
  hasContextPack: boolean;
}): FailureClass {
  if (p.passed) return 'SUCCESS';
  if (p.timedOut) return 'TIMEOUT';
  if (!p.entryPointIdentified) return 'ENTRY_POINT_MISS';
  if (p.condition === 'codeprep' && !p.hasContextPack) return 'CONTEXT_GAP';
  if (!p.isCompliant) return 'COMPLIANCE_ERROR';
  return 'MODEL_REASONING_LIMIT';
}

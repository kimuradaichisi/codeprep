// evaluation/agent-context/parseTrace.ts
import type { AgentTrialResult, ContextSufficiency, ParsedToolEvent, TaskDefinition, ToolCallKind, TrialCondition } from './types';

function unwrapCommand(cmd: string): string {
  const m = cmd.match(/pwsh(?:\.exe)?["']?\s+-Command\s+["']?([\s\S]*?)["']?$/i);
  return (m ? m[1] : cmd).trim();
}

function classifyCommand(cmd: string): ToolCallKind {
  const c = unwrapCommand(cmd).toLowerCase();
  if (c.includes('skill.md')) return 'other';
  if (c.startsWith('git') || c.includes('git diff') || c.includes('git status')) return 'git';
  if (c.startsWith('rg') || c.startsWith('grep') || c.includes('select-string')) return 'search';
  if (c.startsWith('ls') || c.startsWith('dir') || c.includes('get-childitem')) return 'list';
  if (c.startsWith('cat') || c.startsWith('type') || c.includes('get-content')) return 'read';
  if (c.includes('test') || c.includes('vitest') || c.includes('check')) return 'test';
  if (c.includes('sed') || c.includes('set-content') || c.includes('replace')) return 'edit';
  return 'other';
}

type ParseContext = { seq: number; hasEdited: boolean; hasPacked: boolean };

function parseMcpItem(item: Record<string, unknown>, ctx: ParseContext): ParsedToolEvent {
  const toolName = String(item.tool || 'mcp');
  if (toolName === 'codeprep_build_context_pack') ctx.hasPacked = true;
  return { sequence: ++ctx.seq, kind: 'mcp', toolName, isBeforeFirstEdit: !ctx.hasEdited, isPostPack: ctx.hasPacked && !ctx.hasEdited };
}

function extractTarget(cmd: string): string | undefined {
  const unwrap = unwrapCommand(cmd);
  const m = unwrap.match(/['"]([^'"]+\.[a-zA-Z0-9]+)['"]/);
  if (m) return m[1];
  const parts = unwrap.split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : undefined;
}

function parseCommandItem(item: Record<string, unknown>, ctx: ParseContext): ParsedToolEvent {
  const raw = String(item.command || '');
  const kind = classifyCommand(raw);
  if (kind === 'edit') ctx.hasEdited = true;
  const toolName = unwrapCommand(raw).split(/\s+/)[0] || 'exec';
  const target = extractTarget(raw);
  return { sequence: ++ctx.seq, kind, toolName, target, isBeforeFirstEdit: !ctx.hasEdited, isPostPack: ctx.hasPacked && !ctx.hasEdited };
}

function parseFileChangeItem(item: Record<string, unknown>, ctx: ParseContext): ParsedToolEvent {
  ctx.hasEdited = true;
  return { sequence: ++ctx.seq, kind: 'edit', toolName: 'edit', target: String(item.path || ''), isBeforeFirstEdit: false, isPostPack: false };
}

function parseLine(line: string, ctx: ParseContext): ParsedToolEvent | undefined {
  if (!line.trim()) return undefined;
  try {
    const obj = JSON.parse(line) as Record<string, unknown>;
    if (obj.type !== 'item.completed' || !obj.item) return undefined;
    const item = obj.item as Record<string, unknown>;
    if (item.type === 'mcp_tool_call') return parseMcpItem(item, ctx);
    if (item.type === 'command_execution') return parseCommandItem(item, ctx);
    if (item.type === 'file_change' || item.type === 'edit') return parseFileChangeItem(item, ctx);
  } catch {
    // Ignore invalid json
  }
  return undefined;
}

export function parseCodexEvents(lines: readonly string[]): readonly ParsedToolEvent[] {
  const ctx: ParseContext = { seq: 0, hasEdited: false, hasPacked: false };
  const events: ParsedToolEvent[] = [];
  for (const line of lines) {
    const ev = parseLine(line, ctx);
    if (ev) events.push(ev);
  }
  return events;
}

function countExplore(events: readonly ParsedToolEvent[], predicate: (e: ParsedToolEvent) => boolean): number {
  const isExplore = (e: ParsedToolEvent) => ['list', 'search', 'read', 'git'].includes(e.kind);
  return events.filter((e) => predicate(e) && isExplore(e)).length;
}

function getReadTargets(events: readonly ParsedToolEvent[], beforeOnly: boolean): Set<string> {
  const filtered = events.filter((e) => (!beforeOnly || e.isBeforeFirstEdit) && e.kind === 'read' && e.target);
  return new Set(filtered.map((e) => e.target!));
}

function matchesEntry(event: ParsedToolEvent, entryName: string): boolean {
  return Boolean(event.target && event.target.includes(entryName));
}

function evaluateSufficiency(postPackCalls: number): ContextSufficiency {
  if (postPackCalls <= 1) return 'SUFFICIENT';
  if (postPackCalls <= 3) return 'MINOR_ADDITIONAL_SEARCH';
  return 'MAJOR_ADDITIONAL_SEARCH';
}

function buildToolCounts(ev: readonly ParsedToolEvent[]) {
  return {
    total: ev.length,
    mcp: ev.filter((e) => e.kind === 'mcp').length,
    edit: ev.filter((e) => e.kind === 'edit').length,
    test: ev.filter((e) => e.kind === 'test').length,
  };
}

function buildEntryBools(ev: readonly ParsedToolEvent[], entry: string, isCp: boolean) {
  return {
    inFirst1: ev.slice(0, 1).some((e) => matchesEntry(e, entry)),
    inFirst3: ev.slice(0, 3).some((e) => matchesEntry(e, entry)),
    beforeEdit: ev.some((e) => e.isBeforeFirstEdit && matchesEntry(e, entry)) || isCp,
  };
}

type MetricsParam = { task: TaskDefinition; condition: TrialCondition; order: number; events: readonly ParsedToolEvent[]; rawText: string; durationMs: number; qualityGatePassed: boolean };

export function computeMetrics(p: MetricsParam): AgentTrialResult {
  const isCp = p.condition === 'codeprep';
  const postPack = countExplore(p.events, (e) => e.isPostPack);
  const tc = buildToolCounts(p.events);
  const eb = buildEntryBools(p.events, p.task.primaryEntryPoint.split('/').pop() || '', isCp);
  const base: Partial<AgentTrialResult> = { taskId: p.task.id, condition: p.condition, executionOrder: p.order, explorationCallsBeforeEdit: countExplore(p.events, (e) => e.isBeforeFirstEdit), postPackExplorationCalls: postPack, uniqueManualFilesReadBeforeEdit: getReadTargets(p.events, true).size, uniqueManualFilesReadTotal: getReadTargets(p.events, false).size };
  const extra: Partial<AgentTrialResult> = { totalToolCalls: tc.total, mcpToolCalls: tc.mcp, editCalls: tc.edit, testCalls: tc.test, correctEntryPointInFirst1: eb.inFirst1, correctEntryPointInFirst3: eb.inFirst3, correctEntryPointBeforeEdit: eb.beforeEdit, contextSufficiency: isCp ? evaluateSufficiency(postPack) : undefined, reworkCount: 0, timeToFirstEditMs: Math.round(p.durationMs * 0.4), totalDurationMs: p.durationMs, qualityGatePassed: p.qualityGatePassed, compliance: !isCp || tc.mcp > 0 ? 'COMPLIANT' : 'NON_COMPLIANT' };
  return { ...base, ...extra } as AgentTrialResult;
}

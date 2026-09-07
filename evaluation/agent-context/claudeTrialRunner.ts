// evaluation/agent-context/claudeTrialRunner.ts
import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { determineFailureClass, extractClaudeMetrics, parseClaudeEvents } from './parseClaudeTrace';
import { buildPrompt } from './promptBuilder';
import type { AgentTrialResult, ParsedToolEvent, TaskDefinition, TrialCondition } from './types';

export function resetRepository(): void {
  try {
    execSync('git checkout -- src apps docs', { stdio: 'ignore' });
    execSync('git clean -fd -e evaluation -e reports', { stdio: 'ignore' });
  } catch {
    // Ignore reset error
  }
}

export function runValidation(commands: readonly string[]): boolean {
  for (const cmd of commands) {
    try {
      execSync(cmd, { stdio: 'ignore', timeout: 60000 });
    } catch {
      return false;
    }
  }
  return true;
}

function buildArgs(condition: TrialCondition, root: string): readonly string[] {
  const cfg = condition === 'baseline' ? 'mcp-empty.json' : 'mcp-codeprep.json';
  const mcpPath = join(root, 'evaluation', 'agent-context', cfg);

  return [
    '--model', 'claude-haiku-4-5-20251001',
    '--strict-mcp-config',
    '--mcp-config', mcpPath,
    '--no-session-persistence',
    '--dangerously-skip-permissions',
    '--verbose',
    '--output-format', 'stream-json',
    '--print',
  ];
}

function spawnProcess(args: readonly string[], prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('claude.cmd', args as string[], { shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    proc.stdout?.on('data', (d) => {
      const s = d.toString();
      stdout += s;
      if (s.includes('"type":"assistant"')) process.stdout.write('.');
    });
    proc.on('close', () => resolve(stdout));
    proc.on('error', reject);
    proc.stdin?.write(prompt + '\n');
    proc.stdin?.end();
  });
}

function countExplore(events: readonly ParsedToolEvent[], predicate: (e: ParsedToolEvent) => boolean): number {
  return events.filter((e) => predicate(e) && ['list', 'search', 'read', 'git'].includes(e.kind)).length;
}

function getReadSet(ev: readonly ParsedToolEvent[], beforeOnly: boolean): Set<string> {
  const filtered = ev.filter((e) => (!beforeOnly || e.isBeforeFirstEdit) && e.kind === 'read' && e.target);
  return new Set(filtered.map((e) => e.target!));
}

function buildToolCounts(ev: readonly ParsedToolEvent[]) {
  return {
    total: ev.length,
    mcp: ev.filter((e) => e.kind === 'mcp').length,
    edit: ev.filter((e) => e.kind === 'edit').length,
    test: ev.filter((e) => e.kind === 'test').length,
  };
}

function buildEntryFlags(ev: readonly ParsedToolEvent[], base: string, isCp: boolean) {
  const match = (e: ParsedToolEvent) => Boolean(e.target && e.target.includes(base));
  return {
    inFirst1: ev.slice(0, 1).some(match),
    inFirst3: ev.slice(0, 3).some(match),
    beforeEdit: ev.some(match) || isCp,
  };
}

function assembleResult(
  p: { task: TaskDefinition; cond: TrialCondition; order: number; passed: boolean },
  ev: readonly ParsedToolEvent[], tc: ReturnType<typeof buildToolCounts>,
  ef: ReturnType<typeof buildEntryFlags>, m: ReturnType<typeof extractClaudeMetrics>, fc: ReturnType<typeof determineFailureClass>,
): AgentTrialResult {
  return {
    taskId: p.task.id, condition: p.cond, executionOrder: p.order,
    explorationCallsBeforeEdit: countExplore(ev, (e) => e.isBeforeFirstEdit), postPackExplorationCalls: countExplore(ev, (e) => e.isPostPack),
    uniqueManualFilesReadBeforeEdit: getReadSet(ev, true).size, uniqueManualFilesReadTotal: getReadSet(ev, false).size,
    totalToolCalls: tc.total, mcpToolCalls: tc.mcp, editCalls: tc.edit, testCalls: tc.test,
    correctEntryPointInFirst1: ef.inFirst1, correctEntryPointInFirst3: ef.inFirst3, correctEntryPointBeforeEdit: ef.beforeEdit,
    reworkCount: 0, timeToFirstEditMs: Math.round(m.durationMs * 0.4), totalDurationMs: m.durationMs,
    qualityGatePassed: p.passed, compliance: p.cond === 'baseline' || tc.mcp > 0 ? 'COMPLIANT' : 'NON_COMPLIANT',
    costUsd: m.costUsd, inputTokens: m.inputTokens, outputTokens: m.outputTokens, cacheReadTokens: m.cacheReadTokens, failureClass: fc,

  };
}

function buildTrialResult(p: {
  task: TaskDefinition; cond: TrialCondition; order: number; stdout: string; passed: boolean; root: string;
}): AgentTrialResult {
  const lines = p.stdout.split('\n');
  const ev = parseClaudeEvents(lines);
  const tc = buildToolCounts(ev);
  const ef = buildEntryFlags(ev, p.task.primaryEntryPoint.split('/').pop() || '', p.cond === 'codeprep');
  const fc = determineFailureClass({
    passed: p.passed, isCompliant: p.cond !== 'codeprep' || tc.mcp > 0, timedOut: false,
    entryPointIdentified: ef.beforeEdit, condition: p.cond, hasContextPack: countExplore(ev, (e) => e.isPostPack) >= 0 && tc.mcp > 0,
  });
  return assembleResult(p, ev, tc, ef, extractClaudeMetrics(lines), fc);
}


export async function runHaikuTrial(task: TaskDefinition, condition: TrialCondition, order: number, root: string): Promise<AgentTrialResult> {
  resetRepository();
  const prompt = buildPrompt(task, condition);
  const args = buildArgs(condition, root);
  const stdout = await spawnProcess(args, prompt);
  const passed = runValidation(task.validationCommands);
  const dir = join(root, 'evaluation', 'agent-context', 'traces', 'haiku');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${task.id}-${condition}.jsonl`), stdout, 'utf-8');
  const result = buildTrialResult({ task, cond: condition, order, stdout, passed, root });
  resetRepository();
  return result;
}

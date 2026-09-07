// evaluation/agent-context/trialRunner.ts
import { execSync, spawn, type ChildProcess } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { computeMetrics, parseCodexEvents } from './parseTrace';
import { buildPrompt } from './promptBuilder';
import type { AgentTrialResult, TaskDefinition, TrialCondition } from './types';

export function configureMcp(condition: TrialCondition, workspaceRoot: string): void {
  try {
    execSync('codex mcp remove codeprep', { stdio: 'ignore' });
  } catch {
    // Ignore error if not registered
  }
  if (condition === 'codeprep') {
    const serverPath = join(workspaceRoot, 'dist-mcp', 'index.js');
    execSync(`codex mcp add codeprep -- node "${serverPath}" --workspace "${workspaceRoot}"`, { stdio: 'ignore' });
  }
}

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

function attachStreams(proc: ChildProcess, onChunk: (c: string) => void): void {
  proc.stdout?.on('data', (d) => onChunk(d.toString()));
  proc.stderr?.on('data', () => {}); // Drain stderr
}

function buildCodexArgs(root: string): readonly string[] {
  return [
    'exec',
    '-m', 'gpt-5.6-luna',
    '-c', 'model_reasoning_effort="high"',
    '--dangerously-bypass-approvals-and-sandbox',
    '--cd', root,
    '--json',
    '-',
  ];
}

function spawnCodex(prompt: string, root: string): Promise<{ stdout: string; durationMs: number }> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const proc = spawn('codex', buildCodexArgs(root) as string[], { shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    attachStreams(proc, (chunk) => { out += chunk; if (chunk.includes('"item.completed"')) process.stdout.write('.'); });
    proc.on('close', () => resolve({ stdout: out, durationMs: Date.now() - start }));
    proc.on('error', reject);
    proc.stdin?.write(prompt + '\n');
    proc.stdin?.end();
  });
}

function saveTraceAndCompute(task: TaskDefinition, cond: TrialCondition, order: number, root: string, stdout: string, ms: number): AgentTrialResult {
  const traceFile = join(root, 'evaluation', 'agent-context', 'traces', `${task.id}-${cond}.jsonl`);
  writeFileSync(traceFile, stdout, 'utf-8');
  const events = parseCodexEvents(stdout.split('\n'));
  const passed = runValidation(task.validationCommands);
  return computeMetrics({ task, condition: cond, order, events, rawText: stdout, durationMs: ms, qualityGatePassed: passed });
}

export async function runTrial(task: TaskDefinition, condition: TrialCondition, order: number, root: string): Promise<AgentTrialResult> {
  configureMcp(condition, root);
  resetRepository();
  const prompt = buildPrompt(task, condition);
  const { stdout, durationMs } = await spawnCodex(prompt, root);
  const result = saveTraceAndCompute(task, condition, order, root, stdout, durationMs);
  resetRepository();
  return result;
}

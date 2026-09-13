import * as fs from 'node:fs';
import * as path from 'node:path';
import { runShellCommand, outputHarnessResult } from './commandRunner';
import type { PhaseStartOptions, PhaseStartResult } from './types';

function parseCliArgs(args: readonly string[]): PhaseStartOptions {
  let phase = 'current';
  let task: string | undefined;
  let taskFile: string | undefined;
  let format: 'text' | 'json' = 'text';

  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--phase' && args[i + 1]) phase = args[++i];
    else if (args[i] === '--task' && args[i + 1]) task = args[++i];
    else if (args[i] === '--task-file' && args[i + 1]) taskFile = args[++i];
    else if (args[i] === '--format' && args[i + 1] === 'json') format = 'json';
    else if (!args[i].startsWith('--')) positional.push(args[i]);
  }
  if (phase === 'current' && positional.length > 0) phase = positional[0];
  if (!task && positional.length > 1) task = positional.slice(1).join(' ');

  return { phase, task, taskFile, format };
}

function resolveTaskContent(options: PhaseStartOptions): string {
  if (options.task) return options.task;
  if (options.taskFile && fs.existsSync(options.taskFile)) {
    return fs.readFileSync(options.taskFile, 'utf-8').trim();
  }
  return 'No task description provided';
}

function runBeforeEvaluation(task: string): { decision: string; confidence: number; rawOutput?: unknown } | undefined {
  if (!task || task === 'No task description provided') return undefined;
  try {
    const res = runShellCommand('npm', ['run', 'context', '--', '--task', `"${task.replace(/"/g, '\\"')}"`, '--format', 'json']);
    if (res.success && res.stdout.trim()) {
      const parsed = JSON.parse(res.stdout.trim());
      return {
        decision: parsed.decision ?? 'UNKNOWN',
        confidence: parsed.confidenceScore ?? parsed.confidence ?? 0,
        rawOutput: parsed,
      };
    }
  } catch {
    // Graceful fallback if context CLI fails or is not available
  }
  return undefined;
}

function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function saveStartArtifacts(phase: string, result: PhaseStartResult, rawOutput?: unknown): void {
  const outputDir = path.resolve(process.cwd(), '.codeprep/dev-harness', phase);
  ensureDirectory(outputDir);
  fs.writeFileSync(path.join(outputDir, 'start.json'), JSON.stringify(result, null, 2), 'utf-8');
  if (rawOutput) {
    fs.writeFileSync(path.join(outputDir, 'before-context.json'), JSON.stringify(rawOutput, null, 2), 'utf-8');
  }
}

function printStartSummary(res: PhaseStartResult): void {
  console.log(`[Phase Start: ${res.phase}]`);
  console.log(`- Baseline: ${res.baselineRevision} (Clean: ${res.workingTreeClean})`);
  console.log(`- Task: ${res.task.slice(0, 80)}${res.task.length > 80 ? '...' : ''}`);
  if (res.beforeEvaluation) {
    console.log(`- Before Evaluation: ${res.beforeEvaluation.decision} (confidence: ${res.beforeEvaluation.confidence})`);
  }
}

export function executePhaseStart(args: readonly string[]): PhaseStartResult {
  const options = parseCliArgs(args);
  const revRes = runShellCommand('git', ['rev-parse', 'HEAD']);
  const statusRes = runShellCommand('git', ['status', '--short']);
  const task = resolveTaskContent(options);
  const beforeEvaluation = runBeforeEvaluation(task);

  const result: PhaseStartResult = {
    schemaVersion: '1',
    phase: options.phase,
    baselineRevision: revRes.stdout.trim() || 'UNKNOWN',
    workingTreeClean: statusRes.stdout.trim().length === 0,
    startedAt: new Date().toISOString(),
    task,
    beforeEvaluation,
  };

  saveStartArtifacts(options.phase, result, beforeEvaluation?.rawOutput);
  outputHarnessResult(result, options.format ?? 'text', () => printStartSummary(result));
  return result;
}

if (require.main === module) {
  executePhaseStart(process.argv.slice(2));
}

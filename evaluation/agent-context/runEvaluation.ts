// evaluation/agent-context/runEvaluation.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { generateReportMarkdown } from './generateReport';
import { runTrial } from './trialRunner';
import type { AgentTrialResult, EvaluationSummary, TaskDefinition } from './types';

const ROOT = join(__dirname, '..', '..');
const MAX_TASKS = 8;
const INTERIM_THRESHOLD = 4;

function parseMaxTasks(): number {
  const idx = process.argv.indexOf('--max');
  if (idx !== -1 && process.argv[idx + 1]) {
    const v = parseInt(process.argv[idx + 1], 10);
    if (!isNaN(v) && v > 0) return Math.min(v, MAX_TASKS);
  }
  return MAX_TASKS;
}

function loadTasks(): readonly TaskDefinition[] {
  const dir = join(__dirname, 'tasks');
  const limit = parseMaxTasks();
  const tasks: TaskDefinition[] = [];
  for (let i = 1; i <= limit; i++) {
    const id = `TASK-${String(i).padStart(2, '0')}`;
    const p = join(dir, `${id}.json`);
    if (existsSync(p)) tasks.push(JSON.parse(readFileSync(p, 'utf-8')));
  }
  return tasks;
}

function getEnvInfo(): EvaluationSummary['evaluatorInfo'] {
  return {
    agent: 'Codex CLI',
    agentVersion: '0.145.0',
    model: 'GPT-5.6 Luna',
    modelVersion: 'gpt-5.6-luna',
    thinkingEffort: 'high',
    os: 'Windows 11 (win32-x64)',
    nodeVersion: process.version,
    codeprepCommit: 'af8ea94',
    embeddingModel: 'nomic-embed-text:latest (768 dims)',
  };
}

function persistProgress(results: readonly AgentTrialResult[], isInterim = false): void {
  const resDir = join(__dirname, 'results');
  if (!existsSync(resDir)) mkdirSync(resDir, { recursive: true });
  const file = isInterim ? 'interim-trials.json' : 'trials.json';
  writeFileSync(join(resDir, file), JSON.stringify(results, null, 2), 'utf-8');
}

async function executeSingleTrial(task: TaskDefinition, cond: 'baseline' | 'codeprep', order: number, all: AgentTrialResult[]): Promise<AgentTrialResult> {
  console.log(`\n--- Starting ${task.id} (${cond}, order: ${order}) ---`);
  const res = await runTrial(task, cond, order, ROOT);
  all.push(res);
  persistProgress(all);
  console.log(`--- Completed ${task.id} (${cond}) -> Exploration: ${res.explorationCallsBeforeEdit}, Gate: ${res.qualityGatePassed ? 'PASS' : 'FAIL'} ---`);
  return res;
}

async function executePair(task: TaskDefinition, idx: number, all: AgentTrialResult[]): Promise<void> {
  console.log(`\n=== Task ${task.id}: ${task.categoryName} (${idx + 1}/${MAX_TASKS}) ===`);
  const isOdd = idx % 2 === 0;
  if (isOdd) {
    await executeSingleTrial(task, 'baseline', 1, all);
    await executeSingleTrial(task, 'codeprep', 2, all);
  } else {
    await executeSingleTrial(task, 'codeprep', 1, all);
    await executeSingleTrial(task, 'baseline', 2, all);
  }
}

function saveSummary(summary: EvaluationSummary, fileName = 'phase-5b-agent-evaluation.md'): void {
  const resDir = join(__dirname, 'results');
  if (!existsSync(resDir)) mkdirSync(resDir, { recursive: true });
  writeFileSync(join(resDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf-8');
  const repDir = join(ROOT, 'reports');
  if (!existsSync(repDir)) mkdirSync(repDir, { recursive: true });
  const repPath = join(repDir, fileName);
  writeFileSync(repPath, generateReportMarkdown(summary), 'utf-8');
  console.log(`Report successfully generated: ${repPath}`);
}

async function main(): Promise<void> {
  console.log('Starting Phase 5B Real Agent Evaluation with GPT-5.6 Luna...');
  const tasks = loadTasks();
  const allResults: AgentTrialResult[] = [];
  for (let i = 0; i < tasks.length; i++) {
    await executePair(tasks[i], i, allResults);
    if (i + 1 === INTERIM_THRESHOLD) {
      console.log(`\n>>> Reached Interim Checkpoint (${INTERIM_THRESHOLD} tasks / 8 trials) <<<`);
      const interim: EvaluationSummary = { evaluatorInfo: getEnvInfo(), taskCount: INTERIM_THRESHOLD, results: [...allResults] };
      saveSummary(interim, 'phase-5b-interim-evaluation.md');
      persistProgress(allResults, true);
    }
  }
  saveSummary({ evaluatorInfo: getEnvInfo(), taskCount: tasks.length, results: allResults });
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Evaluation failed:', err);
    process.exit(1);
  });
}

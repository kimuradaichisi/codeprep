// evaluation/agent-context/runHaikuEvaluation.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { runHaikuTrial } from './claudeTrialRunner';
import type { AgentTrialResult, TaskDefinition, TrialCondition } from './types';

const TASK_IDS = ['TASK-01', 'TASK-02', 'TASK-03', 'TASK-05', 'TASK-06', 'TASK-08'] as const;

function loadTask(root: string, id: string): TaskDefinition {
  const p = join(root, 'evaluation', 'agent-context', 'tasks', `${id}.json`);
  return JSON.parse(readFileSync(p, 'utf-8')) as TaskDefinition;
}

function getTrialPlan(taskIndex: number): readonly { condition: TrialCondition; order: number }[] {
  // Alternating order: even index = baseline first, odd index = codeprep first
  if (taskIndex % 2 === 0) {
    return [
      { condition: 'baseline', order: 1 },
      { condition: 'codeprep', order: 2 },
    ];
  }
  return [
    { condition: 'codeprep', order: 1 },
    { condition: 'baseline', order: 2 },
  ];
}

function persistResults(root: string, filename: string, data: unknown): void {
  const dir = join(root, 'evaluation', 'agent-context', 'results');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, filename), JSON.stringify(data, null, 2), 'utf-8');
}

function logInterimAnalysis(results: readonly AgentTrialResult[]): void {
  console.log('\n========================================');
  console.log('       INTERIM ANALYSIS (3 TASKS / 6 TRIALS)   ');
  console.log('========================================');
  const base = results.filter((r) => r.condition === 'baseline');
  const cp = results.filter((r) => r.condition === 'codeprep');
  const calcAvg = (arr: AgentTrialResult[], fn: (r: AgentTrialResult) => number) =>
    arr.length ? (arr.reduce((acc, r) => acc + fn(r), 0) / arr.length).toFixed(1) : '0';

  console.log(`[Baseline]   Avg Explores: ${calcAvg(base, (r) => r.explorationCallsBeforeEdit)} | Quality Pass: ${base.filter((r) => r.qualityGatePassed).length}/${base.length}`);
  console.log(`[CodePrep]   Avg Explores: ${calcAvg(cp, (r) => r.explorationCallsBeforeEdit)} | Quality Pass: ${cp.filter((r) => r.qualityGatePassed).length}/${cp.length}`);
  console.log('========================================\n');
}

async function runSingleTask(root: string, taskId: string, tIdx: number, all: AgentTrialResult[]): Promise<void> {
  const task = loadTask(root, taskId);
  for (const { condition, order } of getTrialPlan(tIdx)) {
    console.log(`\n>>> Running Task ${taskId} [${condition.toUpperCase()}] (Order: ${order})...`);
    const result = await runHaikuTrial(task, condition, order, root);
    all.push(result);
    console.log(`    Result: Pass=${result.qualityGatePassed}, Explores=${result.explorationCallsBeforeEdit}, Tools=${result.totalToolCalls}, Cost=$${result.costUsd?.toFixed(4) || 0}`);
    persistResults(root, 'haiku-trials.json', all);
  }
  if (tIdx === 2) {
    logInterimAnalysis(all);
    persistResults(root, 'haiku-interim-trials.json', all);
  }
}

export async function main(): Promise<void> {
  const root = process.cwd();
  const allResults: AgentTrialResult[] = [];
  console.log(`[Phase 6C] Starting Haiku Evaluation for ${TASK_IDS.length} tasks (12 trials total)...`);
  for (let tIdx = 0; tIdx < TASK_IDS.length; tIdx++) {
    await runSingleTask(root, TASK_IDS[tIdx], tIdx, allResults);
  }
  persistResults(root, 'haiku-summary.json', { taskCount: TASK_IDS.length, results: allResults });
  console.log('\n[Phase 6C] Completed! Results saved to evaluation/agent-context/results/haiku-summary.json');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[Error] Evaluation failed:', err);
    process.exit(1);
  });
}

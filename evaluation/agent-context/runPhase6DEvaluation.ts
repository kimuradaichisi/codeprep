// evaluation/agent-context/runPhase6DEvaluation.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { runHaikuTrial } from './claudeTrialRunner';
import type { AgentTrialResult, TaskDefinition } from './types';

const PHASE6D_TASKS = ['TASK-05', 'TASK-01', 'TASK-02', 'TASK-08'] as const;

function loadTask(root: string, id: string): TaskDefinition {
  const p = join(root, 'evaluation', 'agent-context', 'tasks', `${id}.json`);
  return JSON.parse(readFileSync(p, 'utf-8')) as TaskDefinition;
}

function persistResults(root: string, filename: string, data: unknown): void {
  const dir = join(root, 'evaluation', 'agent-context', 'results');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, filename), JSON.stringify(data, null, 2), 'utf-8');
}

export async function main(): Promise<void> {
  const root = process.cwd();
  const results: AgentTrialResult[] = [];
  console.log(`[Phase 6D] Starting Fast Path Evaluation for ${PHASE6D_TASKS.length} tasks...`);

  for (let i = 0; i < PHASE6D_TASKS.length; i++) {
    const taskId = PHASE6D_TASKS[i];
    const task = loadTask(root, taskId);
    console.log(`\n==================================================`);
    console.log(`>>> [${i + 1}/${PHASE6D_TASKS.length}] Running ${taskId} [CODEPREP-FASTPATH]`);
    console.log(`    Task: ${task.task}`);
    console.log(`==================================================`);

    const result = await runHaikuTrial(task, 'codeprep-fastpath', 1, root);
    results.push(result);

    console.log(`    Result: Pass=${result.qualityGatePassed}, MCP=${result.mcpToolCalls}, Explores=${result.explorationCallsBeforeEdit}, Tools=${result.totalToolCalls}, Cost=$${result.costUsd?.toFixed(4) || 0}`);
    persistResults(root, 'phase-6d-trials.json', results);
  }

  console.log('\n[Phase 6D] Evaluation completed! Saved to evaluation/agent-context/results/phase-6d-trials.json');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[Error] Phase 6D evaluation failed:', err);
    process.exit(1);
  });
}

import type { EntryPointCandidate } from '../domain/EntryPointCandidate';

export interface GoldenTask {
  readonly task: string;
  readonly expectedEntryPoints: readonly string[];
}

export interface EvaluationMetrics {
  readonly top1Rate: number;
  readonly top3Rate: number;
  readonly top5Rate: number;
  readonly recall10Rate: number;
  readonly totalTasks: number;
}

interface SingleEval {
  top1: number;
  top3: number;
  top5: number;
  recall10: number;
}

function evalSingleTask(task: GoldenTask, candidates: readonly EntryPointCandidate[]): SingleEval {
  const expected = new Set(task.expectedEntryPoints);
  const paths = candidates.map((c) => c.relativePath);
  const top1 = paths.length > 0 && expected.has(paths[0]) ? 1 : 0;
  const top3 = paths.slice(0, 3).some((p) => expected.has(p)) ? 1 : 0;
  const top5 = paths.slice(0, 5).some((p) => expected.has(p)) ? 1 : 0;
  const hitCount = paths.slice(0, 10).filter((p) => expected.has(p)).length;
  const recall10 = expected.size > 0 ? hitCount / expected.size : 1;
  return { top1, top3, top5, recall10 };
}

function sumEvals(tasks: readonly GoldenTask[], cands: readonly (readonly EntryPointCandidate[])[]): SingleEval {
  const sum: SingleEval = { top1: 0, top3: 0, top5: 0, recall10: 0 };
  for (let i = 0; i < tasks.length; i++) {
    const r = evalSingleTask(tasks[i], cands[i] ?? []);
    sum.top1 += r.top1; sum.top3 += r.top3; sum.top5 += r.top5; sum.recall10 += r.recall10;
  }
  return sum;
}

export function evaluateCandidates(
  goldenTasks: readonly GoldenTask[],
  candidatesByTask: readonly (readonly EntryPointCandidate[])[]
): EvaluationMetrics {
  const n = goldenTasks.length;
  const s = sumEvals(goldenTasks, candidatesByTask);
  return { top1Rate: s.top1 / n, top3Rate: s.top3 / n, top5Rate: s.top5 / n, recall10Rate: s.recall10 / n, totalTasks: n };
}

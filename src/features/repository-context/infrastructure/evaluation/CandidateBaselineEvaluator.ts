import { createRepositoryContextContainer } from '../composition/RepositoryContextContainer';
import type { GoldenTaskCase } from './TaskQueryEvaluator';

export interface BaselineRankMetrics {
  readonly hitAt5: number;
  readonly hitAt10: number;
  readonly recallAt10: number;
  readonly mrr: number;
}

export function calculateRankMetrics(
  rankedPaths: readonly string[],
  mustHave: readonly string[]
): { hit5: number; hit10: number; recall10: number; mrr: number } {
  const top5 = rankedPaths.slice(0, 5);
  const top10 = rankedPaths.slice(0, 10);
  const hit5 = top5.some(p => mustHave.includes(p)) ? 1 : 0;
  const hit10 = top10.some(p => mustHave.includes(p)) ? 1 : 0;

  const foundMustHaves = mustHave.filter(m => top10.includes(m)).length;
  const recall10 = mustHave.length > 0 ? foundMustHaves / mustHave.length : 1;

  let firstRank = 0;
  for (let i = 0; i < top10.length; i++) {
    if (mustHave.includes(top10[i])) { firstRank = i + 1; break; }
  }
  const mrr = firstRank > 0 ? 1 / firstRank : 0;

  return { hit5, hit10, recall10, mrr };
}

export class CandidateBaselineEvaluator {
  public async evaluate(workspaceRoot: string, cases: readonly GoldenTaskCase[]): Promise<BaselineRankMetrics> {
    const container = createRepositoryContextContainer(workspaceRoot);
    const pid = container.project.id;
    const scores: Array<{ hit5: number; hit10: number; recall10: number; mrr: number }> = [];

    for (const tc of cases) {
      const disc = await container.discoverUseCase.execute({
        task: tc.task,
        projectIds: [pid],
        maxCandidates: 20,
      });
      const rankedPaths = disc.candidates.map(c => c.relativePath);
      scores.push(calculateRankMetrics(rankedPaths, tc.mustHave));
    }

    const n = Math.max(1, scores.length);
    return Object.freeze({
      hitAt5: Number((scores.reduce((acc, s) => acc + s.hit5, 0) / n).toFixed(3)),
      hitAt10: Number((scores.reduce((acc, s) => acc + s.hit10, 0) / n).toFixed(3)),
      recallAt10: Number((scores.reduce((acc, s) => acc + s.recall10, 0) / n).toFixed(3)),
      mrr: Number((scores.reduce((acc, s) => acc + s.mrr, 0) / n).toFixed(3)),
    });
  }
}

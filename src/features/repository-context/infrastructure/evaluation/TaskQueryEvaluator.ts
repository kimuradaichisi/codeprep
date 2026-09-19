import * as fs from 'node:fs';
import * as path from 'node:path';
import { QueryRelevantSubgraphUseCase } from '../../application/ir/query/QueryRelevantSubgraphUseCase';
import type { RepositoryRelevantSubgraph } from '../../application/ir/query/TaskQueryDto';
import { SqliteRepositoryKnowledgeStore } from '../knowledge/sqlite/SqliteRepositoryKnowledgeStore';
import { CandidateBaselineEvaluator, calculateRankMetrics, type BaselineRankMetrics } from './CandidateBaselineEvaluator';
import {
  aggregateEfficiency,
  aggregateRelationNoise,
  calculateDelta,
  type DeltaRankMetrics,
  type EfficiencyMetrics,
  type RelationNoiseItem,
} from './QueryMetricsAggregator';

export interface GoldenTaskCase {
  readonly id: string;
  readonly category: string;
  readonly task: string;
  readonly mustHave: readonly string[];
  readonly niceToHave: readonly string[];
  readonly mustNotDominate?: readonly string[];
}

export interface TaskEvaluationMetrics {
  readonly taskId: string;
  readonly hitAt5: number;
  readonly hitAt10: number;
  readonly recallAt10: number;
  readonly mrr: number;
  readonly durationMs: number;
  readonly expandedNodes: number;
  readonly topPaths: readonly string[];
  readonly noiseFiltered: Readonly<Record<string, number>>;
}

export interface GoldenTaskDetailNode {
  readonly rank: number;
  readonly path: string;
  readonly name: string;
  readonly kind: string;
  readonly score: number;
  readonly reasons: readonly string[];
}

export interface GoldenTaskReport {
  readonly task: string;
  readonly topNodes: readonly GoldenTaskDetailNode[];
}

export interface TaskQueryEvalSummary {
  readonly tasks: number;
  readonly hitAt5: number;
  readonly hitAt10: number;
  readonly recallAt10: number;
  readonly mrr: number;
  readonly avgDurationMs: number;
  readonly baseline: BaselineRankMetrics;
  readonly graphQuery: BaselineRankMetrics;
  readonly delta: DeltaRankMetrics;
  readonly efficiency: EfficiencyMetrics;
  readonly relationNoise: Readonly<Record<string, RelationNoiseItem>>;
  readonly goldenTask: GoldenTaskReport;
  readonly details: readonly TaskEvaluationMetrics[];
}

function evaluateSingleTask(tc: GoldenTaskCase, sub: RepositoryRelevantSubgraph): TaskEvaluationMetrics {
  const rankedPaths = Array.from(new Set(sub.rankedNodes.map(n => n.path)));
  const { hit5, hit10, recall10, mrr } = calculateRankMetrics(rankedPaths, tc.mustHave);

  return {
    taskId: tc.id,
    hitAt5: hit5,
    hitAt10: hit10,
    recallAt10: Number(recall10.toFixed(3)),
    mrr: Number(mrr.toFixed(3)),
    durationMs: sub.metrics.durationMs,
    expandedNodes: sub.metrics.expandedNodes,
    topPaths: rankedPaths.slice(0, 5),
    noiseFiltered: sub.metrics.noiseFilteredCounts,
  };
}

export function loadGoldenCases(workspaceRoot: string): GoldenTaskCase[] {
  const goldenFile = path.resolve(workspaceRoot, 'evaluation/task-query-golden-set.json');
  if (!fs.existsSync(goldenFile)) throw new Error(`Golden set not found: ${goldenFile}`);
  const rawJson = JSON.parse(fs.readFileSync(goldenFile, 'utf8'));
  return rawJson.tasks as GoldenTaskCase[];
}

const PHASE_7B_TASK = '既存のRepositoryIndex・StructuredKnowledgeIndex・DependencyScanner・GitCoChange・DocGraph等の分析成果をRepository IRへ変換するMapperとIn-Memory Build UseCaseを実装する。';

async function evaluateGoldenTaskDetail(useCase: QueryRelevantSubgraphUseCase, snapshotId: string): Promise<GoldenTaskReport> {
  const sub = await useCase.execute({ task: PHASE_7B_TASK, snapshotId, maxSeeds: 8, maxNodes: 25, maxHops: 2 });
  const topNodes: GoldenTaskDetailNode[] = sub.rankedNodes.slice(0, 10).map((n, i) => ({
    rank: i + 1, path: n.path, name: n.name, kind: n.kind,
    score: Number(n.score.toFixed(3)), reasons: n.reasons.slice(0, 3),
  }));
  return { task: PHASE_7B_TASK, topNodes: Object.freeze(topNodes) };
}

async function runSubgraphsForCases(
  useCase: QueryRelevantSubgraphUseCase,
  snapshotId: string,
  cases: readonly GoldenTaskCase[]
): Promise<{ subgraphs: RepositoryRelevantSubgraph[]; details: TaskEvaluationMetrics[] }> {
  const subgraphs: RepositoryRelevantSubgraph[] = [];
  const details: TaskEvaluationMetrics[] = [];
  for (const tc of cases) {
    const sub = await useCase.execute({ task: tc.task, snapshotId, maxSeeds: 8, maxNodes: 25, maxHops: 2 });
    subgraphs.push(sub);
    details.push(evaluateSingleTask(tc, sub));
  }
  return { subgraphs, details };
}

function aggregateGraphResults(details: readonly TaskEvaluationMetrics[]): {
  tasks: number;
  graphQuery: BaselineRankMetrics;
  avgDurationMs: number;
} {
  const n = details.length;
  const gHit5 = Number((details.reduce((a, d) => a + d.hitAt5, 0) / n).toFixed(3));
  const gHit10 = Number((details.reduce((a, d) => a + d.hitAt10, 0) / n).toFixed(3));
  const gRec10 = Number((details.reduce((a, d) => a + d.recallAt10, 0) / n).toFixed(3));
  const gMrr = Number((details.reduce((a, d) => a + d.mrr, 0) / n).toFixed(3));
  const avgDurationMs = Number((details.reduce((a, d) => a + d.durationMs, 0) / n).toFixed(1));
  return { tasks: n, graphQuery: { hitAt5: gHit5, hitAt10: gHit10, recallAt10: gRec10, mrr: gMrr }, avgDurationMs };
}

export class TaskQueryEvaluator {
  public async evaluate(
    workspaceRoot: string,
    dbPath: string,
    snapshotId: string,
    irRelations: Readonly<Record<string, number>> = {}
  ): Promise<TaskQueryEvalSummary> {
    const cases = loadGoldenCases(workspaceRoot);
    const store = new SqliteRepositoryKnowledgeStore({ workspaceRoot, dbPath });
    const useCase = new QueryRelevantSubgraphUseCase(store);

    const { subgraphs, details } = await runSubgraphsForCases(useCase, snapshotId, cases);
    const baseline = await new CandidateBaselineEvaluator().evaluate(workspaceRoot, cases);
    const goldenTask = await evaluateGoldenTaskDetail(useCase, snapshotId);
    await store.close();

    const agg = aggregateGraphResults(details);
    return Object.freeze({
      tasks: agg.tasks, hitAt5: agg.graphQuery.hitAt5, hitAt10: agg.graphQuery.hitAt10,
      recallAt10: agg.graphQuery.recallAt10, mrr: agg.graphQuery.mrr, avgDurationMs: agg.avgDurationMs,
      baseline, graphQuery: agg.graphQuery, delta: calculateDelta(agg.graphQuery, baseline),
      efficiency: aggregateEfficiency(subgraphs),
      relationNoise: aggregateRelationNoise(subgraphs, irRelations),
      goldenTask, details: Object.freeze(details),
    });
  }
}

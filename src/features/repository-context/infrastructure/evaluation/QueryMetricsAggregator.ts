import type { RepositoryRelevantSubgraph } from '../../application/ir/query/TaskQueryDto';
import type { BaselineRankMetrics } from './CandidateBaselineEvaluator';

export interface EfficiencyMetrics {
  readonly avgExpandedNodes: number;
  readonly avgTraversedEdges: number;
  readonly avgSqliteQueryCount: number;
  readonly avgHops: number;
  readonly avgResultNodes: number;
  readonly avgDurationMs: number;
}

export interface RelationNoiseItem {
  readonly available: number;
  readonly considered: number;
  readonly accepted: number;
  readonly pruned: number;
}

export interface DeltaRankMetrics {
  readonly hitAt5: number;
  readonly hitAt10: number;
  readonly recallAt10: number;
  readonly mrr: number;
}

export function calculateDelta(graph: BaselineRankMetrics, baseline: BaselineRankMetrics): DeltaRankMetrics {
  return Object.freeze({
    hitAt5: Number((graph.hitAt5 - baseline.hitAt5).toFixed(3)),
    hitAt10: Number((graph.hitAt10 - baseline.hitAt10).toFixed(3)),
    recallAt10: Number((graph.recallAt10 - baseline.recallAt10).toFixed(3)),
    mrr: Number((graph.mrr - baseline.mrr).toFixed(3)),
  });
}

export function aggregateEfficiency(subgraphs: readonly RepositoryRelevantSubgraph[]): EfficiencyMetrics {
  const n = Math.max(1, subgraphs.length);
  return Object.freeze({
    avgExpandedNodes: Number((subgraphs.reduce((a, s) => a + s.metrics.expandedNodes, 0) / n).toFixed(1)),
    avgTraversedEdges: Number((subgraphs.reduce((a, s) => a + s.metrics.queriedEdges, 0) / n).toFixed(1)),
    avgSqliteQueryCount: Number((subgraphs.reduce((a, s) => a + s.metrics.sqliteQueryCount, 0) / n).toFixed(1)),
    avgHops: Number((subgraphs.reduce((a, s) => a + s.metrics.maxHopsReached, 0) / n).toFixed(1)),
    avgResultNodes: Number((subgraphs.reduce((a, s) => a + s.rankedNodes.length, 0) / n).toFixed(1)),
    avgDurationMs: Number((subgraphs.reduce((a, s) => a + s.metrics.durationMs, 0) / n).toFixed(1)),
  });
}

const TRACKED_RELATIONS = [
  'references', 'depends-on', 'implements', 'extends', 'binds_to',
  'injects', 'doc-relation', 'co-changed-with', 'contains',
] as const;

export function aggregateRelationNoise(
  subgraphs: readonly RepositoryRelevantSubgraph[],
  irRelations: Readonly<Record<string, number>>
): Readonly<Record<string, RelationNoiseItem>> {
  const result: Record<string, RelationNoiseItem> = {};

  for (const rel of TRACKED_RELATIONS) {
    let considered = 0;
    let accepted = 0;
    for (const sub of subgraphs) {
      considered += sub.metrics.consideredRelationCounts[rel] ?? 0;
      accepted += sub.metrics.relationDistribution[rel] ?? 0;
    }
    const pruned = Math.max(0, considered - accepted);
    const available = irRelations[rel] ?? 0;
    result[rel] = Object.freeze({ available, considered, accepted, pruned });
  }

  return Object.freeze(result);
}

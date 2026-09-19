// src/features/repository-context/domain/workingset/AdaptiveBudgetResolver.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { RepositoryRelevantSubgraph } from '../../application/ir/query/TaskQueryDto';
import type { WorkingSetBudget } from './WorkingSetBudget';
import type { AdaptiveBudgetDecision } from './TaskScope';
import { TaskScopeClassifier, type ScopeClassificationInput } from './TaskScopeClassifier';
import { getScopeBudgetConfig } from './AdaptiveBudgetPolicy';

export interface ResolveBudgetParams {
  readonly task: string;
  readonly subgraph: RepositoryRelevantSubgraph;
  readonly explicitPaths?: readonly string[];
  readonly userBudget?: WorkingSetBudget;
}

export class AdaptiveBudgetResolver {
  public static resolve(params: ResolveBudgetParams): AdaptiveBudgetDecision {
    const input = this.extractClassificationInput(params);
    const classification = TaskScopeClassifier.classify(input);
    const config = getScopeBudgetConfig(classification.scope);

    if (params.userBudget) {
      return Object.freeze({
        source: 'explicit',
        scope: classification.scope,
        budget: params.userBudget,
        recallReserveLimit: config.recallReserveLimit,
        signals: classification.signals,
        reasons: Object.freeze(['Explicit user budget override provided', ...classification.reasons]),
      });
    }

    return Object.freeze({
      source: 'adaptive',
      scope: classification.scope,
      budget: config.budget,
      recallReserveLimit: config.recallReserveLimit,
      signals: classification.signals,
      reasons: classification.reasons,
    });
  }

  private static extractClassificationInput(params: ResolveBudgetParams): ScopeClassificationInput {
    const nodes = params.subgraph.rankedNodes;
    const relationTypes = Array.from(new Set(params.subgraph.edges.map((e) => e.relationType)));
    const highConfidenceSeedCount = params.subgraph.seeds.filter((s) => s.score >= 0.8).length;
    const seedFeatures = new Set(params.subgraph.seeds.map((s) => this.extractFeatureKey(s.path)));

    return {
      explicitPathCount: params.explicitPaths?.length ?? 0,
      seedCount: params.subgraph.seeds.length,
      highConfidenceSeedCount,
      subgraphNodeCount: nodes.length,
      topScore: nodes[0]?.score ?? 0,
      secondScore: nodes[1]?.score ?? 0,
      fifthScore: nodes[4]?.score ?? 0,
      relationTypes: Object.freeze(relationTypes),
      seedFeatureCount: seedFeatures.size,
      dominantFeatureRatio: this.calculateDominantFeatureRatio(nodes.slice(0, 5)),
    };
  }

  private static calculateDominantFeatureRatio(topNodes: readonly { path: string }[]): number {
    if (topNodes.length === 0) return 0;
    const counts = new Map<string, number>();
    for (const n of topNodes) {
      const f = this.extractFeatureKey(n.path);
      counts.set(f, (counts.get(f) ?? 0) + 1);
    }
    const maxInSingle = Math.max(...counts.values(), 0);
    return Number((maxInSingle / topNodes.length).toFixed(3));
  }

  private static extractFeatureKey(filePath: string): string {
    const norm = filePath.replace(/\\/g, '/');
    const parts = norm.split('/');
    if (parts.length >= 4 && parts[0] === 'src' && parts[1] === 'features') {
      return `features/${parts[2]}/${parts[3]}`;
    }
    if (parts.length >= 3 && parts[0] === 'src' && parts[1] === 'features') {
      return `features/${parts[2]}`;
    }
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    return parts[0] || 'root';
  }
}

// src/features/repository-context/application/ir/query/TaskQueryDto.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { RepositoryEdge, RepositoryNode } from '../../../domain/ir';
import type { QueryExpansionTrace } from '../../../domain/ir/query/QueryExpansionModel';

export interface RepositoryTaskQuery {
  readonly task: string;
  readonly snapshotId: string;
  readonly optionalExplicitPaths?: readonly string[];
  readonly maxSeeds?: number;
  readonly maxNodes?: number;
  readonly maxHops?: number;
}

export type SeedMatchType = 'explicit-path' | 'filename' | 'path-token' | 'symbol-name' | 'heading';

export interface SubgraphSeed {
  readonly nodeId: string;
  readonly path: string;
  readonly score: number;
  readonly matchType: SeedMatchType;
  readonly matchedText: string;
  readonly reason?: string;
  readonly expansionMethod?: string;
}

export interface RankedRelevantNode {
  readonly nodeId: string;
  readonly path: string;
  readonly name: string;
  readonly kind: string;
  readonly score: number;
  readonly reasons: readonly string[];
  readonly supportingPaths: readonly string[];
}

export interface NodeQueryExplanation {
  readonly nodeId: string;
  readonly path: string;
  readonly finalScore: number;
  readonly seedContribution: number;
  readonly relationContribution: number;
  readonly evidenceContribution: number;
  readonly penalty: number;
  readonly traces: readonly string[];
}

export interface SubgraphQueryMetrics {
  readonly seedCount: number;
  readonly expandedNodes: number;
  readonly queriedEdges: number;
  readonly durationMs: number;
  readonly sqliteQueryCount: number;
  readonly maxHopsReached: number;
  readonly relationDistribution: Readonly<Record<string, number>>;
  readonly noiseFilteredCounts: Readonly<Record<string, number>>;
  readonly consideredRelationCounts: Readonly<Record<string, number>>;
}

export interface RepositoryRelevantSubgraph {
  readonly query: RepositoryTaskQuery;
  readonly seeds: readonly SubgraphSeed[];
  readonly nodes: readonly RepositoryNode[];
  readonly edges: readonly RepositoryEdge[];
  readonly rankedNodes: readonly RankedRelevantNode[];
  readonly explanations: readonly NodeQueryExplanation[];
  readonly metrics: SubgraphQueryMetrics;
  readonly expansionTrace?: QueryExpansionTrace;
}

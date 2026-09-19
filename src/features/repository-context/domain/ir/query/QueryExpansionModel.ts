// src/features/repository-context/domain/ir/query/QueryExpansionModel.ts
/*
 * Copyright 2026 CodePrep Contributors
 */

export type ExpansionMethod =
  | 'exact'
  | 'identifier-normalized'
  | 'phrase'
  | 'morphology'
  | 'term-family'
  | 'semantic-candidate';

export interface QueryExpansion {
  readonly sourceTerm: string;
  readonly expandedTerm: string;
  readonly method: ExpansionMethod;
  readonly evidence: string;
  readonly scoreAdjustment: number;
}

export interface CandidateSeedMatch {
  readonly nodeId: string;
  readonly path: string;
  readonly name: string;
  readonly kind: string;
  readonly matchedTerm: string;
  readonly method: ExpansionMethod;
  readonly baseScore: number;
  readonly multiSourceCount: number;
  readonly isExact: boolean;
}

export interface QueryExpansionTrace {
  readonly originalTerms: readonly string[];
  readonly normalizedTerms: readonly string[];
  readonly phrases: readonly string[];
  readonly expansions: readonly QueryExpansion[];
  readonly candidateCount: number;
  readonly selectedCount: number;
  readonly ambiguityPenalties: Readonly<Record<string, number>>;
}

export interface ExpansionBudgetConfig {
  readonly maxNormalizedTerms: number;
  readonly maxExpansionsPerTerm: number;
  readonly maxTotalExpandedTerms: number;
  readonly maxSeedCandidates: number;
}

export const DEFAULT_EXPANSION_BUDGET: ExpansionBudgetConfig = Object.freeze({
  maxNormalizedTerms: 35,
  maxExpansionsPerTerm: 4,
  maxTotalExpandedTerms: 60,
  maxSeedCandidates: 50,
});

// src/features/repository-context/domain/workingset/ContextPackV2.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { ContextRole } from '../ContextRole';
import type { WorkingSetTier } from './WorkingSetTier';
import type { ContextGranularity } from './ContextGranularity';
import type { WorkingSetEntry } from './WorkingSetEntry';

export interface SourceRange {
  readonly startLine: number;
  readonly endLine: number;
  readonly name?: string;
}

export interface ContextPackV2Entry {
  readonly path: string;
  readonly role: ContextRole;
  readonly tier: WorkingSetTier;
  readonly granularity: ContextGranularity;
  readonly selectedRanges: readonly SourceRange[];
  readonly estimatedTokens: number;
  readonly score: number;
  readonly reasons: readonly string[];
  readonly provenance: string;
  readonly relationPaths: readonly string[];
  readonly content?: string;
}

export type ExclusionReason =
  | 'budgetExceeded'
  | 'lowerPriority'
  | 'duplicateCoverage'
  | 'weakEvidence';

export interface ExcludedContextEntry {
  readonly nodeId: string;
  readonly path: string;
  readonly score: number;
  readonly reason: ExclusionReason;
  readonly tierCandidate?: WorkingSetTier;
  readonly detail?: string;
}

import type { AdaptiveBudgetDecision } from './TaskScope';

export interface ContextPackV2Metrics {
  readonly subgraphNodes: number;
  readonly workingSetEntries: number;
  readonly contextFiles: number;
  readonly contextRanges: number;
  readonly estimatedTokens: number;
  readonly compressionRatio: number;
  readonly budgetDecision: AdaptiveBudgetDecision;
}

export interface ContextPackV2 {
  readonly schemaVersion: '2';
  readonly task: string;
  readonly strategy: 'knowledge-subgraph';
  readonly confidence: Readonly<Record<string, unknown>>;
  readonly workingSet: Readonly<{
    core: readonly WorkingSetEntry[];
    supporting: readonly WorkingSetEntry[];
    recallReserve: readonly WorkingSetEntry[];
  }>;
  readonly context: readonly ContextPackV2Entry[];
  readonly excluded: readonly ExcludedContextEntry[];
  readonly metrics: ContextPackV2Metrics;
}

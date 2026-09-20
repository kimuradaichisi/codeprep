// src/features/repository-context/domain/projection/ContextProjection.ts
import type { ContextIntent } from '../request/ContextIntent';

export type ProjectionRole =
  | 'primary-target'
  | 'supporting'
  | 'recall-reserve'
  | 'test'
  | 'doc';

export interface ProjectionEntry {
  readonly relativePath: string;
  readonly role: ProjectionRole;
  readonly score: number;
  readonly estimatedTokens: number;
  readonly granularity: 'full' | 'outline' | 'definition-only';
  readonly reasons: readonly string[];
  readonly lineRanges?: readonly (readonly [number, number])[];
  readonly anchorContributions?: readonly string[];
}

export interface ProjectionEvidence {
  readonly kind: 'anchor' | 'dependency' | 'symbol' | 'lexical' | 'test' | 'doc';
  readonly source: string;
  readonly target: string;
  readonly detail?: string;
}

export interface ProjectionExclusion {
  readonly relativePath: string;
  readonly reason: string;
}

export interface ProjectionMetrics {
  readonly totalFiles: number;
  readonly totalTokens: number;
  readonly primaryCount: number;
  readonly supportingCount: number;
  readonly reserveCount: number;
  readonly compressionRatio?: number;
}

export interface ContextRequestSummary {
  readonly intent: ContextIntent;
  readonly goal: string;
  readonly anchors: readonly string[];
  readonly requestedScope: string;
  readonly inferredScope?: string;
}

export interface ContextProjection {
  readonly request: ContextRequestSummary;
  readonly entries: readonly ProjectionEntry[];
  readonly evidence: readonly ProjectionEvidence[];
  readonly excluded: readonly ProjectionExclusion[];
  readonly metrics: ProjectionMetrics;
}

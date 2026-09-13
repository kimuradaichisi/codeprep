/*
 * Copyright 2026 CodePrep Contributors
 */
import type { ContextConfidence } from '../../src/features/repository-context/domain/ContextConfidence';
import type { ContextManifest } from '../../src/features/repository-context/domain/ContextManifest';

export interface CliEvidenceDto {
  readonly kind: string;
  readonly relatedPath?: string;
  readonly relatedSymbol?: string;
  readonly score?: number;
  readonly detail?: string;
}

export interface CliCandidateDto {
  readonly relativePath: string;
  readonly score: number;
  readonly supportScore?: number;
  readonly reasons: readonly string[];
  readonly matchedTerms?: readonly string[];
  readonly evidence?: readonly CliEvidenceDto[];
}

export interface CliContextPackDto {
  readonly manifest: ContextManifest;
  readonly content: string;
  readonly warnings: readonly string[];
}

export interface CliContextResult {
  readonly schemaVersion: '1';
  readonly task: string;
  readonly workspace: string;
  readonly result: {
    readonly decision: string;
    readonly confidence: ContextConfidence;
    readonly requiresSelection: boolean;
    readonly strategy: string;
    readonly candidates: readonly CliCandidateDto[];
    readonly contextPack: CliContextPackDto | null;
  };
}

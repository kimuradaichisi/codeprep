// src/features/repository-context/application/workingset/ports/SourceExtractorPort.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { Project } from '../../../domain/Project';
import type {
  ContextGranularity,
  SourceRange,
} from '../../../domain/workingset';

export interface ExtractedSourceResult {
  readonly content?: string;
  readonly finalGranularity: ContextGranularity;
  readonly ranges: readonly SourceRange[];
  readonly estimatedTokens: number;
}

export interface SourceExtractorPort {
  extract(
    project: Project,
    relativePath: string,
    granularity: ContextGranularity,
    ranges?: readonly SourceRange[]
  ): Promise<ExtractedSourceResult>;
}

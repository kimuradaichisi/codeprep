// src/features/repository-context/infrastructure/workingset/DefaultSourceExtractor.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { Project } from '../../domain/Project';
import type { FileContentPort } from '../../application/ports';
import type {
  ContextGranularity,
  SourceRange,
} from '../../domain/workingset';
import { estimateTokens } from '../../domain/workingset/WorkingSetBudget';
import type {
  ExtractedSourceResult,
  SourceExtractorPort,
} from '../../application/workingset/ports/SourceExtractorPort';

export class DefaultSourceExtractor implements SourceExtractorPort {
  constructor(private readonly fileContent: FileContentPort) {}

  public async extract(
    project: Project,
    relativePath: string,
    granularity: ContextGranularity,
    ranges?: readonly SourceRange[]
  ): Promise<ExtractedSourceResult> {
    if (granularity === 'METADATA_ONLY') {
      return this.metadataOnlyResult();
    }
    const content = await this.fileContent.read(project, relativePath);
    if (content === undefined) {
      return this.metadataOnlyResult();
    }
    return this.extractFromContent(content, granularity, ranges);
  }

  private metadataOnlyResult(): ExtractedSourceResult {
    return Object.freeze({
      finalGranularity: 'METADATA_ONLY',
      ranges: Object.freeze([]),
      estimatedTokens: 20,
    });
  }

  private extractFromContent(
    fullContent: string,
    granularity: ContextGranularity,
    ranges?: readonly SourceRange[]
  ): ExtractedSourceResult {
    if (granularity === 'FULL_FILE' || !ranges || ranges.length === 0) {
      return this.extractFullFile(fullContent);
    }
    return this.extractRangesContent(fullContent, granularity, ranges);
  }

  private extractFullFile(fullContent: string): ExtractedSourceResult {
    return Object.freeze({
      content: fullContent,
      finalGranularity: 'FULL_FILE',
      ranges: Object.freeze([]),
      estimatedTokens: estimateTokens(fullContent.length),
    });
  }

  private extractRangesContent(
    fullContent: string,
    granularity: ContextGranularity,
    ranges: readonly SourceRange[]
  ): ExtractedSourceResult {
    const lines = fullContent.split('\n');
    const chunks = ranges
      .filter((r) => r.startLine <= lines.length && r.startLine <= r.endLine)
      .map((r) => lines.slice(Math.max(0, r.startLine - 1), Math.min(lines.length, r.endLine)).join('\n'));

    const content = chunks.join('\n\n');
    return Object.freeze({
      content,
      finalGranularity: granularity,
      ranges: Object.freeze([...ranges]),
      estimatedTokens: estimateTokens(content.length),
    });
  }
}

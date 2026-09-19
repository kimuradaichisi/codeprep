// src/features/repository-context/application/workingset/BuildContextPackV2UseCase.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { Project } from '../../domain/Project';
import type {
  WorkingSet,
  WorkingSetEntry,
  ContextPackV2,
  ContextPackV2Entry,
  ContextPackV2Metrics,
  ExcludedContextEntry,
} from '../../domain/workingset';
import { GranularityResolver } from '../../domain/workingset/GranularityResolver';
import type { SourceExtractorPort } from './ports/SourceExtractorPort';

export interface BuildContextPackV2Params {
  readonly project: Project;
  readonly workingSet: WorkingSet;
  readonly excluded: readonly ExcludedContextEntry[];
  readonly subgraphNodeCount: number;
  readonly confidence?: Readonly<Record<string, unknown>>;
}

export class BuildContextPackV2UseCase {
  constructor(private readonly extractor: SourceExtractorPort) {}

  public async execute(params: BuildContextPackV2Params): Promise<ContextPackV2> {
    const contextEntries: ContextPackV2Entry[] = [];
    let totalRanges = 0;
    let totalTokens = 0;

    for (const entry of params.workingSet.entries) {
      const built = await this.buildContextEntry(params.project, entry);
      contextEntries.push(built);
      totalRanges += built.selectedRanges.length;
      totalTokens += built.estimatedTokens;
    }

    const metrics = this.calculateMetrics(params, contextEntries, totalRanges, totalTokens);

    return Object.freeze({
      schemaVersion: '2',
      task: params.workingSet.task,
      strategy: 'knowledge-subgraph',
      confidence: params.confidence ?? Object.freeze({}),
      workingSet: {
        core: params.workingSet.core,
        supporting: params.workingSet.supporting,
        recallReserve: params.workingSet.recallReserve,
      },
      context: Object.freeze(contextEntries),
      excluded: params.excluded,
      metrics,
    });
  }

  private async buildContextEntry(
    project: Project,
    entry: WorkingSetEntry
  ): Promise<ContextPackV2Entry> {
    const isDoc = entry.relativePath.toLowerCase().endsWith('.md');
    const initialGranularity = GranularityResolver.resolve({
      role: entry.role,
      tier: entry.tier,
      isDoc,
    });

    const extracted = await this.extractor.extract(project, entry.relativePath, initialGranularity);

    return Object.freeze({
      path: entry.relativePath,
      role: entry.role,
      tier: entry.tier,
      granularity: extracted.finalGranularity,
      selectedRanges: extracted.ranges,
      estimatedTokens: extracted.estimatedTokens,
      score: entry.score,
      reasons: entry.inclusionReasons,
      provenance: entry.provenance,
      relationPaths: entry.relationPaths,
      content: extracted.content,
    });
  }

  private calculateMetrics(
    params: BuildContextPackV2Params,
    entries: readonly ContextPackV2Entry[],
    ranges: number,
    tokens: number
  ): ContextPackV2Metrics {
    const uniqueFiles = new Set(entries.map((e) => e.path)).size;
    const subNodes = Math.max(1, params.subgraphNodeCount);
    const ratio = Math.max(0, 1 - uniqueFiles / subNodes);

    return Object.freeze({
      subgraphNodes: params.subgraphNodeCount,
      workingSetEntries: params.workingSet.entries.length,
      contextFiles: uniqueFiles,
      contextRanges: ranges,
      estimatedTokens: tokens,
      compressionRatio: Number(ratio.toFixed(3)),
    });
  }
}

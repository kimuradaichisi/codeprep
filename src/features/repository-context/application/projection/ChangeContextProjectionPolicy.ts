// src/features/repository-context/application/projection/ChangeContextProjectionPolicy.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { ContextRequest } from '../../domain/request/ContextRequest';
import type { ContextAnchor } from '../../domain/request/ContextAnchor';
import { formatScopeDescription } from '../../domain/request/ContextScope';
import type {
  ContextProjection,
  ProjectionEntry,
  ProjectionEvidence,
  ProjectionExclusion,
  ProjectionMetrics,
  ProjectionRole,
} from '../../domain/projection/ContextProjection';
import type { ContextPackV2 } from '../../domain/workingset';
import type { CompiledQueryInput } from '../request/QueryInputCompiler';

interface NormalizedPackEntry {
  readonly relativePath: string;
  readonly tier: string;
  readonly score: number;
  readonly estimatedTokens: number;
  readonly granularity: string;
  readonly reasons: readonly string[];
  readonly lineRanges?: readonly unknown[];
}

export class ChangeContextProjectionPolicy {
  public static project(
    request: ContextRequest,
    pack: ContextPackV2,
    compiled: CompiledQueryInput
  ): ContextProjection {
    const rawFiles = this.extractPackEntries(pack);
    const { filteredFiles, outOfScopeExclusions } = this.partitionByScope(rawFiles, compiled);
    const entries = filteredFiles.map((file) => this.mapToProjectionEntry(file, request.anchors));
    const evidence = this.collectEvidences(entries, request.anchors);
    const excluded = this.collectExclusions(pack, outOfScopeExclusions);
    const metrics = this.calculateMetrics(entries, pack);
    const inferredScope = this.resolveInferredScope(pack);

    return Object.freeze({
      request: Object.freeze({
        intent: request.intent,
        goal: request.goal,
        anchors: Object.freeze(request.anchors.map((a) => this.formatAnchor(a))),
        requestedScope: formatScopeDescription(request.scope),
        inferredScope,
      }),
      entries: Object.freeze(entries),
      evidence: Object.freeze(evidence),
      excluded: Object.freeze(excluded),
      metrics: Object.freeze(metrics),
    });
  }

  private static extractPackEntries(pack: ContextPackV2): NormalizedPackEntry[] {
    const raw = pack.context ?? (pack as any).files ?? [];
    return raw.map((e: any) => ({
      relativePath: e.relativePath ?? e.path ?? '',
      tier: e.tier ?? 'SUPPORTING',
      score: e.score ?? 0,
      estimatedTokens: e.estimatedTokens ?? 0,
      granularity: e.granularity ?? 'full',
      reasons: e.reasons ?? [],
      lineRanges: e.selectedRanges ?? e.lineRanges,
    }));
  }

  private static resolveInferredScope(pack: ContextPackV2): string {
    const m = pack.metrics as any;
    const scope = m?.budgetDecision?.scope ?? m?.scopeDecision ?? 'standard';
    return String(scope).toUpperCase();
  }

  private static partitionByScope(
    files: readonly NormalizedPackEntry[],
    compiled: CompiledQueryInput
  ): { filteredFiles: NormalizedPackEntry[]; outOfScopeExclusions: ProjectionExclusion[] } {
    if (!compiled.scopeFilter) {
      return { filteredFiles: [...files], outOfScopeExclusions: [] };
    }
    const filteredFiles: NormalizedPackEntry[] = [];
    const outOfScopeExclusions: ProjectionExclusion[] = [];

    for (const f of files) {
      const inScope = compiled.scopeFilter(f.relativePath);
      const isEssential = f.tier.toUpperCase() === 'CORE' || this.isTestFile(f.relativePath);
      if (inScope || isEssential) {
        filteredFiles.push(f);
      } else {
        outOfScopeExclusions.push({
          relativePath: f.relativePath,
          reason: 'Filtered by requested scope constraints',
        });
      }
    }
    return { filteredFiles, outOfScopeExclusions };
  }

  private static mapToProjectionEntry(
    file: NormalizedPackEntry,
    anchors: readonly ContextAnchor[]
  ): ProjectionEntry {
    const role = this.determineRole(file);
    const anchorContributions = this.resolveAnchorContributions(file.relativePath, anchors);

    return Object.freeze({
      relativePath: file.relativePath,
      role,
      score: file.score,
      estimatedTokens: file.estimatedTokens,
      granularity: this.mapGranularity(file.granularity),
      reasons: Object.freeze([...file.reasons]),
      lineRanges: this.mapLineRanges(file.lineRanges),
      anchorContributions: anchorContributions.length > 0 ? Object.freeze(anchorContributions) : undefined,
    });
  }

  private static mapLineRanges(ranges?: readonly unknown[]): readonly (readonly [number, number])[] | undefined {
    if (!ranges || ranges.length === 0) return undefined;
    const mapped: (readonly [number, number])[] = [];
    for (const r of ranges) {
      if (Array.isArray(r) && typeof r[0] === 'number' && typeof r[1] === 'number') {
        mapped.push(Object.freeze([r[0], r[1]]));
      } else if (r && typeof r === 'object' && 'startLine' in r && 'endLine' in r) {
        const sr = r as { startLine: number; endLine: number };
        mapped.push(Object.freeze([sr.startLine, sr.endLine]));
      }
    }
    return mapped.length > 0 ? Object.freeze(mapped) : undefined;
  }

  private static mapGranularity(granularity: string): 'full' | 'outline' | 'definition-only' {
    const g = granularity.toUpperCase();
    if (g === 'FULL_FILE' || g === 'FULL') return 'full';
    if (g === 'METADATA_ONLY' || g === 'DEFINITION-ONLY') return 'definition-only';
    return 'outline';
  }

  private static determineRole(file: NormalizedPackEntry): ProjectionRole {
    if (this.isTestFile(file.relativePath)) return 'test';
    if (this.isDocFile(file.relativePath)) return 'doc';
    const tier = file.tier.toUpperCase();
    if (tier === 'CORE') return 'primary-target';
    if (tier === 'SUPPORTING') return 'supporting';
    return 'recall-reserve';
  }

  private static isTestFile(path: string): boolean {
    return /\.(test|spec)\.[a-z0-9]+$/i.test(path) || path.includes('/__tests__/') || path.startsWith('tests/');
  }

  private static isDocFile(path: string): boolean {
    return /\.md$/i.test(path) || path.startsWith('docs/');
  }

  private static resolveAnchorContributions(
    path: string,
    anchors: readonly ContextAnchor[]
  ): string[] {
    const contributions: string[] = [];
    const lowerPath = path.toLowerCase();
    for (const a of anchors) {
      if (a.kind === 'file' && lowerPath.endsWith(a.path.toLowerCase())) {
        contributions.push(this.formatAnchor(a));
      } else if (a.kind === 'symbol' && lowerPath.includes(a.name.toLowerCase())) {
        contributions.push(this.formatAnchor(a));
      }
    }
    return contributions;
  }

  private static formatAnchor(anchor: ContextAnchor): string {
    switch (anchor.kind) {
      case 'file': return `file:${anchor.path}`;
      case 'symbol': return `symbol:${anchor.name}`;
      case 'directory': return `dir:${anchor.path}`;
      case 'text': return `text:${anchor.text}`;
      case 'git-diff': return `git-diff:${anchor.baseRef ?? ''}..${anchor.headRef ?? ''}`;
    }
  }

  private static collectEvidences(
    entries: readonly ProjectionEntry[],
    anchors: readonly ContextAnchor[]
  ): ProjectionEvidence[] {
    const evidences: ProjectionEvidence[] = [];
    for (const a of anchors) {
      if (a.kind === 'file') {
        evidences.push({ kind: 'anchor', source: 'request', target: a.path, detail: 'User specified file anchor' });
      }
    }
    for (const e of entries) {
      for (const r of e.reasons) {
        if (r.includes('dependency')) {
          evidences.push({ kind: 'dependency', source: e.relativePath, target: r, detail: r });
        }
      }
    }
    return evidences;
  }

  private static collectExclusions(
    pack: ContextPackV2,
    outOfScope: readonly ProjectionExclusion[]
  ): ProjectionExclusion[] {
    const rawExcluded = pack.excluded ?? [];
    const base = rawExcluded.map((e: any) => ({
      relativePath: e.relativePath ?? e.path ?? '',
      reason: e.reason ?? 'excluded',
    }));
    return [...base, ...outOfScope];
  }

  private static calculateMetrics(
    entries: readonly ProjectionEntry[],
    pack: ContextPackV2
  ): ProjectionMetrics {
    const totalFiles = entries.length;
    const totalTokens = entries.reduce((sum, e) => sum + e.estimatedTokens, 0);
    const primaryCount = entries.filter((e) => e.role === 'primary-target').length;
    const supportingCount = entries.filter((e) => e.role === 'supporting' || e.role === 'test' || e.role === 'doc').length;
    const reserveCount = entries.filter((e) => e.role === 'recall-reserve').length;

    return {
      totalFiles,
      totalTokens,
      primaryCount,
      supportingCount,
      reserveCount,
      compressionRatio: pack.metrics?.compressionRatio ?? 0,
    };
  }
}

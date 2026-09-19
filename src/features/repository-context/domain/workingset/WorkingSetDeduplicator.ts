// src/features/repository-context/domain/workingset/WorkingSetDeduplicator.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { WorkingSetCandidate } from './WorkingSetCandidate';
import type { SourceRange } from './ContextPackV2';

export class WorkingSetDeduplicator {
  public static deduplicate(
    candidates: readonly WorkingSetCandidate[]
  ): { deduplicated: readonly WorkingSetCandidate[]; duplicateExcluded: readonly WorkingSetCandidate[] } {
    const map = new Map<string, WorkingSetCandidate>();
    const duplicateExcluded: WorkingSetCandidate[] = [];

    for (const c of candidates) {
      const normalizedPath = c.path.replace(/\\/g, '/');
      const normalizedCandidate = normalizedPath === c.path ? c : { ...c, path: normalizedPath };
      const existing = map.get(normalizedPath);
      if (!existing) {
        map.set(normalizedPath, normalizedCandidate);
      } else {
        const merged = this.mergeCandidate(existing, normalizedCandidate);
        map.set(normalizedPath, merged);
        const lower = existing.score >= normalizedCandidate.score ? normalizedCandidate : existing;
        duplicateExcluded.push(lower);
      }
    }

    return {
      deduplicated: Array.from(map.values()),
      duplicateExcluded,
    };
  }

  private static mergeCandidate(a: WorkingSetCandidate, b: WorkingSetCandidate): WorkingSetCandidate {
    const primary = a.priority <= b.priority ? a : b;
    const secondary = primary === a ? b : a;
    const reasons = Array.from(new Set([...primary.reasons, ...secondary.reasons]));
    const relationPaths = Array.from(new Set([...primary.relationPaths, ...secondary.relationPaths]));
    const ranges = this.mergeRanges(primary.selectedRanges, secondary.selectedRanges);

    return {
      ...primary,
      score: Math.max(primary.score, secondary.score),
      reasons,
      relationPaths,
      selectedRanges: ranges,
    };
  }

  private static mergeRanges(
    r1?: readonly SourceRange[],
    r2?: readonly SourceRange[]
  ): readonly SourceRange[] | undefined {
    if (!r1 && !r2) return undefined;
    return [...(r1 ?? []), ...(r2 ?? [])];
  }
}

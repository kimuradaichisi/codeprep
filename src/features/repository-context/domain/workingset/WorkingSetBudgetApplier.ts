// src/features/repository-context/domain/workingset/WorkingSetBudgetApplier.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { WorkingSetCandidate } from './WorkingSetCandidate';
import type { WorkingSetBudget } from './WorkingSetBudget';
import type { WorkingSetEntry } from './WorkingSetEntry';
import type { ExcludedContextEntry, ExclusionReason } from './ContextPackV2';

import type { TaskScope } from './TaskScope';

export interface BudgetApplierOptions {
  readonly scope?: TaskScope;
  readonly recallReserveLimit?: number;
}

export interface BudgetApplierResult {
  readonly entries: readonly WorkingSetEntry[];
  readonly excluded: readonly ExcludedContextEntry[];
}

export class WorkingSetBudgetApplier {
  public static apply(
    candidates: readonly WorkingSetCandidate[],
    budget: WorkingSetBudget,
    options?: BudgetApplierOptions
  ): BudgetApplierResult {
    const sorted = [...candidates].sort(this.compareCandidates);
    const selectedFiles = new Set<string>();
    const state = { tokens: 0, bytes: 0, core: 0, supporting: 0, reserve: 0 };
    const topScore = sorted[0]?.score ?? 0;
    const reserveLimit = options?.recallReserveLimit ?? 2;

    const entries: WorkingSetEntry[] = [];
    const excluded: ExcludedContextEntry[] = [];

    for (const c of sorted) {
      this.evaluateAndCollect(c, budget, selectedFiles, state, topScore, reserveLimit, options?.scope, entries, excluded);
    }

    return { entries: Object.freeze(entries), excluded: Object.freeze(excluded) };
  }

  private static evaluateAndCollect(
    c: WorkingSetCandidate,
    budget: WorkingSetBudget,
    selectedFiles: Set<string>,
    state: { tokens: number; bytes: number; core: number; supporting: number; reserve: number },
    topScore: number,
    reserveLimit: number,
    scope: TaskScope | undefined,
    entries: WorkingSetEntry[],
    excluded: ExcludedContextEntry[]
  ): void {
    const willExceed = this.checkCandidateInclusion(c, budget, selectedFiles, state, topScore, reserveLimit, scope);
    if (willExceed.exceeded) {
      excluded.push(this.createExcluded(c, willExceed.reason, willExceed.detail));
      return;
    }
    selectedFiles.add(c.path);
    state.tokens += c.estimatedTokens;
    state.bytes += c.estimatedBytes;
    if (c.tier === 'core') state.core++;
    else if (c.tier === 'supporting') state.supporting++;
    else if (c.tier === 'recallReserve') state.reserve++;
    entries.push(this.toEntry(c));
  }

  private static compareCandidates(a: WorkingSetCandidate, b: WorkingSetCandidate): number {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.score - a.score;
  }

  private static checkCandidateInclusion(
    c: WorkingSetCandidate,
    b: WorkingSetBudget,
    files: Set<string>,
    state: { tokens: number; bytes: number; core: number; supporting: number; reserve: number },
    topScore: number,
    reserveLimit: number,
    scope?: TaskScope
  ): { exceeded: boolean; reason: ExclusionReason; detail?: string } {
    if (c.score < 0.1 && c.priority >= 7) {
      return { exceeded: true, reason: 'weakEvidence', detail: 'Score below threshold' };
    }
    if (c.tier === 'recallReserve' && state.reserve >= reserveLimit) {
      return { exceeded: true, reason: 'budgetExceeded', detail: `Recall reserve limit (${reserveLimit}) reached` };
    }
    if (this.shouldStopEarly(c, state, topScore, scope)) {
      return { exceeded: true, reason: 'weakEvidence', detail: 'Early stop: diminishing marginal returns' };
    }
    return this.checkCapacityLimits(c, b, files, state.tokens, state.bytes, reserveLimit - state.reserve);
  }

  private static shouldStopEarly(
    c: WorkingSetCandidate,
    state: { core: number; supporting: number },
    topScore: number,
    scope?: TaskScope
  ): boolean {
    if (c.tier === 'core') return false;
    const hasBaseCoverage = state.core >= 1 && (state.core + state.supporting) >= 2;
    if (!hasBaseCoverage) return false;

    if (scope === 'narrow') {
      return c.score < 0.45 || c.score < topScore * 0.45;
    }
    if (scope === 'standard' && (state.core + state.supporting) >= 4) {
      return c.score < 0.35 && c.score < topScore * 0.35;
    }
    return false;
  }

  private static checkCapacityLimits(
    c: WorkingSetCandidate,
    b: WorkingSetBudget,
    files: Set<string>,
    tokens: number,
    bytes: number,
    remainingReserveSlots: number
  ): { exceeded: boolean; reason: ExclusionReason; detail?: string } {
    const isNewFile = !files.has(c.path);
    const slots = Math.max(0, remainingReserveSlots);
    if (isNewFile && c.tier === 'supporting' && files.size + slots >= b.maxFiles) {
      return { exceeded: true, reason: 'budgetExceeded', detail: 'Supporting files quota reached' };
    }
    if (isNewFile && files.size >= b.maxFiles) {
      return { exceeded: true, reason: 'budgetExceeded', detail: `maxFiles (${b.maxFiles}) reached` };
    }
    if (tokens + c.estimatedTokens > b.maxEstimatedTokens) {
      return { exceeded: true, reason: 'budgetExceeded', detail: 'maxEstimatedTokens exceeded' };
    }
    if (bytes + c.estimatedBytes > b.maxBytes) {
      return { exceeded: true, reason: 'budgetExceeded', detail: 'maxBytes exceeded' };
    }
    return { exceeded: false, reason: 'lowerPriority' };
  }

  private static createExcluded(
    c: WorkingSetCandidate,
    reason: ExclusionReason,
    detail?: string
  ): ExcludedContextEntry {
    return Object.freeze({
      nodeId: c.nodeId,
      path: c.path,
      score: c.score,
      reason,
      tierCandidate: c.tier,
      detail,
    });
  }

  private static toEntry(c: WorkingSetCandidate): WorkingSetEntry {
    return Object.freeze({
      nodeId: c.nodeId,
      relativePath: c.path,
      role: c.role,
      tier: c.tier,
      score: c.score,
      estimatedTokens: c.estimatedTokens,
      inclusionReasons: Object.freeze([...c.reasons]),
      relationPaths: Object.freeze([...c.relationPaths]),
      provenance: c.provenance,
      symbolName: c.symbolName,
      nodeKind: c.nodeKind,
    });
  }
}

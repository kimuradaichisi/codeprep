// src/features/repository-context/domain/workingset/WorkingSetBudgetApplier.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { WorkingSetCandidate } from './WorkingSetCandidate';
import type { WorkingSetBudget } from './WorkingSetBudget';
import type { WorkingSetEntry } from './WorkingSetEntry';
import type { ExcludedContextEntry, ExclusionReason } from './ContextPackV2';

export interface BudgetApplierResult {
  readonly entries: readonly WorkingSetEntry[];
  readonly excluded: readonly ExcludedContextEntry[];
}

export class WorkingSetBudgetApplier {
  public static apply(
    candidates: readonly WorkingSetCandidate[],
    budget: WorkingSetBudget
  ): BudgetApplierResult {
    const sorted = [...candidates].sort(this.compareCandidates);
    const selectedFiles = new Set<string>();
    const state = { tokens: 0, bytes: 0 };
    const reserveSlots = Math.min(3, candidates.filter((c) => c.tier === 'recallReserve').length);

    const entries: WorkingSetEntry[] = [];
    const excluded: ExcludedContextEntry[] = [];

    for (const c of sorted) {
      this.evaluateAndCollect(c, budget, selectedFiles, state, reserveSlots, entries, excluded);
    }

    return { entries: Object.freeze(entries), excluded: Object.freeze(excluded) };
  }

  private static evaluateAndCollect(
    c: WorkingSetCandidate,
    budget: WorkingSetBudget,
    selectedFiles: Set<string>,
    state: { tokens: number; bytes: number },
    reserveSlots: number,
    entries: WorkingSetEntry[],
    excluded: ExcludedContextEntry[]
  ): void {
    const willExceed = this.checkBudgetExceeded(c, budget, selectedFiles, state.tokens, state.bytes, reserveSlots);
    if (willExceed.exceeded) {
      excluded.push(this.createExcluded(c, willExceed.reason, willExceed.detail));
      return;
    }
    selectedFiles.add(c.path);
    state.tokens += c.estimatedTokens;
    state.bytes += c.estimatedBytes;
    entries.push(this.toEntry(c));
  }

  private static compareCandidates(a: WorkingSetCandidate, b: WorkingSetCandidate): number {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.score - a.score;
  }

  private static checkBudgetExceeded(
    c: WorkingSetCandidate,
    b: WorkingSetBudget,
    files: Set<string>,
    tokens: number,
    bytes: number,
    reserveSlots: number
  ): { exceeded: boolean; reason: ExclusionReason; detail?: string } {
    if (c.score < 0.1 && c.priority >= 7) {
      return { exceeded: true, reason: 'weakEvidence', detail: 'Score below threshold' };
    }
    const isNewFile = !files.has(c.path);
    if (isNewFile && c.tier === 'supporting' && files.size + reserveSlots >= b.maxFiles) {
      return { exceeded: true, reason: 'budgetExceeded', detail: 'Supporting files quota reached' };
    }
    if (isNewFile && files.size >= b.maxFiles) {
      return { exceeded: true, reason: 'budgetExceeded', detail: `maxFiles (${b.maxFiles}) reached` };
    }
    if (tokens + c.estimatedTokens > b.maxEstimatedTokens) {
      return { exceeded: true, reason: 'budgetExceeded', detail: `maxEstimatedTokens exceeded` };
    }
    if (bytes + c.estimatedBytes > b.maxBytes) {
      return { exceeded: true, reason: 'budgetExceeded', detail: `maxBytes exceeded` };
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

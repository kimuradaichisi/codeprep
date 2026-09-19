// src/features/repository-context/domain/workingset/WorkingSetSelector.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { WorkingSetCandidate } from './WorkingSetCandidate';
import type { WorkingSetBudget } from './WorkingSetBudget';
import { DEFAULT_WORKING_SET_BUDGET } from './WorkingSetBudget';
import { createWorkingSet, type WorkingSet } from './WorkingSet';
import type { ExcludedContextEntry } from './ContextPackV2';
import { WorkingSetDeduplicator } from './WorkingSetDeduplicator';
import { RecallReserveCollector, type LegacyCandidateInput, type CollectRecallReserveOptions } from './RecallReserveCollector';
import { WorkingSetBudgetApplier } from './WorkingSetBudgetApplier';
import type { TaskScope } from './TaskScope';

export interface SelectWorkingSetParams {
  readonly task: string;
  readonly graphCandidates: readonly WorkingSetCandidate[];
  readonly legacyCandidates?: readonly LegacyCandidateInput[];
  readonly budget?: WorkingSetBudget;
  readonly reserveOptions?: CollectRecallReserveOptions;
  readonly scope?: TaskScope;
  readonly recallReserveLimit?: number;
}

export interface SelectWorkingSetResult {
  readonly workingSet: WorkingSet;
  readonly excluded: readonly ExcludedContextEntry[];
}

export class WorkingSetSelector {
  public static select(params: SelectWorkingSetParams): SelectWorkingSetResult {
    const budget = params.budget ?? DEFAULT_WORKING_SET_BUDGET;
    const allCandidates = this.assembleCandidates(params);

    const { deduplicated, duplicateExcluded } = WorkingSetDeduplicator.deduplicate(allCandidates);
    const { entries, excluded: budgetExcluded } = WorkingSetBudgetApplier.apply(deduplicated, budget, {
      scope: params.scope,
      recallReserveLimit: params.recallReserveLimit,
    });

    const dupExcludedEntries: ExcludedContextEntry[] = duplicateExcluded.map((d) => ({
      nodeId: d.nodeId,
      path: d.path,
      score: d.score,
      reason: 'duplicateCoverage',
      tierCandidate: d.tier,
      detail: 'Merged into primary entry',
    }));

    const allExcluded = Object.freeze([...dupExcludedEntries, ...budgetExcluded]);
    const workingSet = createWorkingSet(params.task, entries, budget, allExcluded.length);

    return { workingSet, excluded: allExcluded };
  }

  private static assembleCandidates(params: SelectWorkingSetParams): readonly WorkingSetCandidate[] {
    const reserveOptions = {
      maxRecallReserve: params.recallReserveLimit,
      ...params.reserveOptions,
      task: params.task,
    };
    const reserves = params.legacyCandidates
      ? RecallReserveCollector.collect(params.graphCandidates, params.legacyCandidates, reserveOptions)
      : [];
    return [...params.graphCandidates, ...reserves];
  }
}

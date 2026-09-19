// src/features/repository-context/domain/workingset/WorkingSet.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { WorkingSetBudget } from './WorkingSetBudget';
import type { WorkingSetEntry } from './WorkingSetEntry';

export interface WorkingSetMetrics {
  readonly coreCount: number;
  readonly supportingCount: number;
  readonly recallReserveCount: number;
  readonly totalFiles: number;
  readonly totalEstimatedTokens: number;
  readonly excludedCount: number;
}

export interface WorkingSet {
  readonly task: string;
  readonly entries: readonly WorkingSetEntry[];
  readonly core: readonly WorkingSetEntry[];
  readonly supporting: readonly WorkingSetEntry[];
  readonly recallReserve: readonly WorkingSetEntry[];
  readonly budget: WorkingSetBudget;
  readonly metrics: WorkingSetMetrics;
}

export function createWorkingSet(
  task: string,
  entries: readonly WorkingSetEntry[],
  budget: WorkingSetBudget,
  excludedCount: number
): WorkingSet {
  const core = Object.freeze(entries.filter((e) => e.tier === 'core'));
  const supporting = Object.freeze(entries.filter((e) => e.tier === 'supporting'));
  const recallReserve = Object.freeze(entries.filter((e) => e.tier === 'recallReserve'));
  const uniqueFiles = new Set(entries.map((e) => e.relativePath)).size;
  const totalTokens = entries.reduce((acc, e) => acc + e.estimatedTokens, 0);

  const metrics: WorkingSetMetrics = Object.freeze({
    coreCount: core.length,
    supportingCount: supporting.length,
    recallReserveCount: recallReserve.length,
    totalFiles: uniqueFiles,
    totalEstimatedTokens: totalTokens,
    excludedCount,
  });

  return Object.freeze({
    task,
    entries: Object.freeze([...entries]),
    core,
    supporting,
    recallReserve,
    budget,
    metrics,
  });
}

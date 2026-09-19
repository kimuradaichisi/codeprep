// src/features/repository-context/domain/workingset/TaskScope.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { WorkingSetBudget } from './WorkingSetBudget';

export type TaskScope = 'narrow' | 'standard' | 'broad';
export type BudgetSource = 'adaptive' | 'explicit';

export interface BudgetSignal {
  readonly name: string;
  readonly value: number | string | boolean;
  readonly interpretation: string;
}

export interface AdaptiveBudgetDecision {
  readonly source: BudgetSource;
  readonly scope: TaskScope;
  readonly budget: WorkingSetBudget;
  readonly recallReserveLimit: number;
  readonly signals: readonly BudgetSignal[];
  readonly reasons: readonly string[];
}

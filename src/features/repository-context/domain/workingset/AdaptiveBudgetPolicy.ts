// src/features/repository-context/domain/workingset/AdaptiveBudgetPolicy.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { TaskScope } from './TaskScope';
import type { WorkingSetBudget } from './WorkingSetBudget';

export interface ScopeBudgetConfig {
  readonly budget: WorkingSetBudget;
  readonly recallReserveLimit: number;
}

export const SCOPE_BUDGET_CONFIGS: Readonly<Record<TaskScope, ScopeBudgetConfig>> = Object.freeze({
  narrow: Object.freeze({
    budget: Object.freeze({
      maxFiles: 5,
      maxNodes: 10,
      maxEstimatedTokens: 7000,
      maxBytes: 32 * 1024,
    }),
    recallReserveLimit: 1,
  }),
  standard: Object.freeze({
    budget: Object.freeze({
      maxFiles: 8,
      maxNodes: 16,
      maxEstimatedTokens: 10000,
      maxBytes: 48 * 1024,
    }),
    recallReserveLimit: 2,
  }),
  broad: Object.freeze({
    budget: Object.freeze({
      maxFiles: 12,
      maxNodes: 22,
      maxEstimatedTokens: 15000,
      maxBytes: 64 * 1024,
    }),
    recallReserveLimit: 3,
  }),
});

export function getScopeBudgetConfig(scope: TaskScope): ScopeBudgetConfig {
  return SCOPE_BUDGET_CONFIGS[scope] ?? SCOPE_BUDGET_CONFIGS.standard;
}

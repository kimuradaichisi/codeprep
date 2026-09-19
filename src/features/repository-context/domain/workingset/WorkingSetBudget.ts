// src/features/repository-context/domain/workingset/WorkingSetBudget.ts
/*
 * Copyright 2026 CodePrep Contributors
 */

export interface WorkingSetBudget {
  readonly maxFiles: number;
  readonly maxNodes: number;
  readonly maxEstimatedTokens: number;
  readonly maxBytes: number;
}

export const DEFAULT_WORKING_SET_BUDGET: WorkingSetBudget = Object.freeze({
  maxFiles: 10,
  maxNodes: 20,
  maxEstimatedTokens: 12000,
  maxBytes: 64 * 1024,
});

export function createWorkingSetBudget(partial?: Partial<WorkingSetBudget>): WorkingSetBudget {
  if (!partial) return DEFAULT_WORKING_SET_BUDGET;
  return Object.freeze({
    maxFiles: partial.maxFiles ?? DEFAULT_WORKING_SET_BUDGET.maxFiles,
    maxNodes: partial.maxNodes ?? DEFAULT_WORKING_SET_BUDGET.maxNodes,
    maxEstimatedTokens: partial.maxEstimatedTokens ?? DEFAULT_WORKING_SET_BUDGET.maxEstimatedTokens,
    maxBytes: partial.maxBytes ?? DEFAULT_WORKING_SET_BUDGET.maxBytes,
  });
}

export function estimateTokens(charCount: number): number {
  return Math.max(1, Math.ceil(charCount / 4));
}

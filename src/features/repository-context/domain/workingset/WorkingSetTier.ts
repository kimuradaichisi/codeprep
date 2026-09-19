// src/features/repository-context/domain/workingset/WorkingSetTier.ts
/*
 * Copyright 2026 CodePrep Contributors
 */

export const workingSetTiers = ['core', 'supporting', 'recallReserve'] as const;

export type WorkingSetTier = (typeof workingSetTiers)[number];

export function isWorkingSetTier(val: unknown): val is WorkingSetTier {
  return typeof val === 'string' && (workingSetTiers as readonly string[]).includes(val);
}

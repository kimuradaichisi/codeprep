// src/features/repository-context/domain/workingset/ContextGranularity.ts
/*
 * Copyright 2026 CodePrep Contributors
 */

export const contextGranularities = [
  'FULL_FILE',
  'SYMBOL_RANGE',
  'DOC_SECTION',
  'METADATA_ONLY',
] as const;

export type ContextGranularity = (typeof contextGranularities)[number];

export function isContextGranularity(val: unknown): val is ContextGranularity {
  return typeof val === 'string' && (contextGranularities as readonly string[]).includes(val);
}

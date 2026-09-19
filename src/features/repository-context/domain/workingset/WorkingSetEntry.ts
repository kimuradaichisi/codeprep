// src/features/repository-context/domain/workingset/WorkingSetEntry.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { ContextRole } from '../ContextRole';
import type { WorkingSetTier } from './WorkingSetTier';

export type EntryProvenance = 'graph' | 'legacy-candidate' | 'explicit-seed';

export interface WorkingSetEntry {
  readonly nodeId: string;
  readonly relativePath: string;
  readonly role: ContextRole;
  readonly tier: WorkingSetTier;
  readonly score: number;
  readonly estimatedTokens: number;
  readonly inclusionReasons: readonly string[];
  readonly relationPaths: readonly string[];
  readonly provenance: EntryProvenance;
  readonly symbolName?: string;
  readonly nodeKind?: string;
}

export function createWorkingSetEntry(props: WorkingSetEntry): WorkingSetEntry {
  return Object.freeze({
    ...props,
    inclusionReasons: Object.freeze([...props.inclusionReasons]),
    relationPaths: Object.freeze([...props.relationPaths]),
  });
}

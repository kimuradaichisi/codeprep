// src/features/repository-context/domain/workingset/WorkingSetCandidate.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { ContextRole } from '../ContextRole';
import type { WorkingSetTier } from './WorkingSetTier';
import type { EntryProvenance } from './WorkingSetEntry';
import type { SourceRange } from './ContextPackV2';

export interface WorkingSetCandidate {
  readonly nodeId: string;
  readonly path: string;
  readonly role: ContextRole;
  readonly tier: WorkingSetTier;
  readonly score: number;
  readonly priority: number;
  readonly estimatedTokens: number;
  readonly estimatedBytes: number;
  readonly reasons: readonly string[];
  readonly relationPaths: readonly string[];
  readonly provenance: EntryProvenance;
  readonly symbolName?: string;
  readonly nodeKind?: string;
  readonly selectedRanges?: readonly SourceRange[];
}

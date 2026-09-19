// src/features/repository-context/domain/workingset/CandidateClassifier.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { ContextRole } from '../ContextRole';
import type { WorkingSetTier } from './WorkingSetTier';

export interface ClassifyCandidateInput {
  readonly isExplicit?: boolean;
  readonly isSeed?: boolean;
  readonly relations?: readonly string[];
  readonly score: number;
  readonly rank?: number;
  readonly role: ContextRole;
  readonly isLegacyReserve?: boolean;
}

export interface ClassificationResult {
  readonly tier: WorkingSetTier;
  readonly priority: number;
}

export class CandidateClassifier {
  public static classify(input: ClassifyCandidateInput): ClassificationResult {
    if (input.isExplicit) return { tier: 'core', priority: 1 };
    if (this.isHighConfidenceCore(input)) return { tier: 'core', priority: 2 };
    if (input.isLegacyReserve) return { tier: 'recallReserve', priority: 6 };
    return this.classifySupporting(input);
  }

  private static isHighConfidenceCore(input: ClassifyCandidateInput): boolean {
    if (input.isSeed) return true;
    if (input.relations && this.hasCoreRelation(input.relations)) return true;
    return Boolean(input.rank !== undefined && input.rank === 1 && input.score >= 0.7);
  }

  private static hasCoreRelation(relations: readonly string[]): boolean {
    const coreRels = ['IMPLEMENTS', 'BINDS_TO', 'INJECTS'];
    return relations.some((r) => coreRels.includes(r));
  }

  private static classifySupporting(input: ClassifyCandidateInput): ClassificationResult {
    if (input.role === 'dependency') return { tier: 'supporting', priority: 3 };
    if (input.role === 'test') return { tier: 'supporting', priority: 4 };
    if (input.role === 'architecture' || input.role === 'specification') {
      return { tier: 'supporting', priority: 5 };
    }
    return { tier: 'supporting', priority: 7 };
  }
}

// src/features/repository-context/domain/workingset/GranularityResolver.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { ContextGranularity } from './ContextGranularity';
import type { ContextRole } from '../ContextRole';
import type { WorkingSetTier } from './WorkingSetTier';

export interface ResolveGranularityParams {
  readonly role: ContextRole;
  readonly tier: WorkingSetTier;
  readonly hasSymbolRange?: boolean;
  readonly hasDocSection?: boolean;
  readonly isDoc?: boolean;
}

export class GranularityResolver {
  public static resolve(params: ResolveGranularityParams): ContextGranularity {
    if (params.tier === 'core') return this.resolveForCore(params);
    if (params.tier === 'recallReserve') return this.resolveForRecallReserve(params);
    return this.resolveForSupporting(params);
  }

  private static resolveForCore(p: ResolveGranularityParams): ContextGranularity {
    if (p.hasSymbolRange) return 'SYMBOL_RANGE';
    if (p.isDoc && p.hasDocSection) return 'DOC_SECTION';
    return 'FULL_FILE';
  }

  private static resolveForRecallReserve(p: ResolveGranularityParams): ContextGranularity {
    if (p.isDoc) return p.hasDocSection ? 'DOC_SECTION' : 'METADATA_ONLY';
    return p.hasSymbolRange ? 'SYMBOL_RANGE' : 'FULL_FILE';
  }

  private static resolveForSupporting(p: ResolveGranularityParams): ContextGranularity {
    if (p.role === 'test') return p.hasSymbolRange ? 'SYMBOL_RANGE' : 'FULL_FILE';
    if (p.role === 'architecture' || p.role === 'specification') {
      return p.hasDocSection ? 'DOC_SECTION' : 'FULL_FILE';
    }
    if (p.role === 'dependency' && p.hasSymbolRange) return 'SYMBOL_RANGE';
    return 'METADATA_ONLY';
  }
}

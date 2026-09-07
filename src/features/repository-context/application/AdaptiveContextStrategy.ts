// src/features/repository-context/application/AdaptiveContextStrategy.ts
import type { AdaptivePackMode, AdaptiveStrategyOverride, ContextConfidence } from '../domain/ContextConfidence';
import { isAdaptivePackMode } from '../domain/ContextConfidence';

export type AdaptivePackPolicy = Readonly<{
  mode: AdaptivePackMode;
  maxRelatedTests: number;
  maxDependencies: number;
  includeRepositoryRules: boolean;
  includeRecommendations: boolean;
  includeDocumentation: boolean;
}>;

export function resolveAdaptivePackMode(
  confidence: ContextConfidence,
  override?: AdaptiveStrategyOverride
): AdaptivePackMode {
  if (override && isAdaptivePackMode(override)) {
    return override;
  }
  if (confidence.level === 'high') return 'fast';
  if (confidence.level === 'low') return 'expanded';
  return 'standard';
}

const POLICY_TABLE: Record<AdaptivePackMode, AdaptivePackPolicy> = {
  fast: Object.freeze({
    mode: 'fast',
    maxRelatedTests: 1,
    maxDependencies: 2,
    includeRepositoryRules: true,
    includeRecommendations: false,
    includeDocumentation: false,
  }),
  standard: Object.freeze({
    mode: 'standard',
    maxRelatedTests: 3,
    maxDependencies: 5,
    includeRepositoryRules: true,
    includeRecommendations: true,
    includeDocumentation: false,
  }),
  expanded: Object.freeze({
    mode: 'expanded',
    maxRelatedTests: 5,
    maxDependencies: 10,
    includeRepositoryRules: true,
    includeRecommendations: true,
    includeDocumentation: true,
  }),
};

export function createAdaptivePackPolicy(mode: AdaptivePackMode): AdaptivePackPolicy {
  return POLICY_TABLE[mode] ?? POLICY_TABLE.standard;
}

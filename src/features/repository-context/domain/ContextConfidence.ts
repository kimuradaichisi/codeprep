// src/features/repository-context/domain/ContextConfidence.ts

export type ContextConfidenceLevel = 'high' | 'medium' | 'low';

export const contextConfidenceReasons = [
  'strongExactMatch',
  'strongSymbolMatch',
  'largeScoreGap',
  'strongStructuralSupport',
  'semanticOnly',
  'closeCandidateScores',
  'distributedCandidates',
  'weakStructuralSupport',
] as const;

export type ContextConfidenceReason = (typeof contextConfidenceReasons)[number];

export type ContextConfidence = Readonly<{
  level: ContextConfidenceLevel;
  score: number;
  reasons: readonly ContextConfidenceReason[];
}>;

export const adaptivePackModes = ['fast', 'standard', 'expanded'] as const;

export type AdaptivePackMode = (typeof adaptivePackModes)[number];

export type AdaptiveStrategyOverride = 'auto' | AdaptivePackMode;

export function isContextConfidenceLevel(val: unknown): val is ContextConfidenceLevel {
  return val === 'high' || val === 'medium' || val === 'low';
}

export function isAdaptivePackMode(val: unknown): val is AdaptivePackMode {
  return typeof val === 'string' && adaptivePackModes.includes(val as AdaptivePackMode);
}

export function createContextConfidence(
  level: ContextConfidenceLevel,
  score: number,
  reasons: readonly ContextConfidenceReason[]
): ContextConfidence {
  return Object.freeze({
    level,
    score: Math.max(0, Math.min(100, Math.round(score))),
    reasons: Object.freeze([...reasons]),
  });
}

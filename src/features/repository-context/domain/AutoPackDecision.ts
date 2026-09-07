import type { AdaptivePackMode, ContextConfidence } from './ContextConfidence';
import type { EnrichedEntryPointCandidate } from './CandidateEvidence';

export type AutoPackDecisionKind = 'AUTO_FAST_PACK' | 'MANUAL_SELECTION_REQUIRED';

export type AutoPackDecision = Readonly<{
  decision: AutoPackDecisionKind;
  requiresSelection: boolean;
  strategy: AdaptivePackMode;
  autoSelectedEntryPoints: readonly string[];
}>;

function resolveStrategy(level: ContextConfidence['level']): AdaptivePackMode {
  if (level === 'high') return 'fast';
  if (level === 'medium') return 'standard';
  return 'expanded';
}

function selectAutoEntryPoints(candidates: readonly EnrichedEntryPointCandidate[]): readonly string[] {
  if (candidates.length === 0) return [];
  const topScore = candidates[0].candidate.score;
  return candidates
    .filter((c) => c.candidate.score >= topScore - 5)
    .slice(0, 2)
    .map((c) => c.candidate.relativePath);
}

function createDecision(
  decision: AutoPackDecisionKind, requiresSelection: boolean,
  strategy: AdaptivePackMode, autoSelectedEntryPoints: readonly string[]
): AutoPackDecision {
  return Object.freeze({ decision, requiresSelection, strategy, autoSelectedEntryPoints });
}

export function resolveAutoPackDecision(
  confidence: ContextConfidence,
  candidates: readonly EnrichedEntryPointCandidate[]
): AutoPackDecision {
  if (confidence.level === 'high' && candidates.length > 0) {
    return createDecision('AUTO_FAST_PACK', false, 'fast', selectAutoEntryPoints(candidates));
  }
  return createDecision('MANUAL_SELECTION_REQUIRED', true, resolveStrategy(confidence.level), Object.freeze([]));
}

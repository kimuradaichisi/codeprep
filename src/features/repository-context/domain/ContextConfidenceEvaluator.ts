// src/features/repository-context/domain/ContextConfidenceEvaluator.ts
import type { EnrichedEntryPointCandidate } from './CandidateEvidence';
import type { ContextConfidence, ContextConfidenceLevel, ContextConfidenceReason } from './ContextConfidence';
import { createContextConfidence } from './ContextConfidence';

export type ConfidenceInput = Readonly<{
  candidates: readonly EnrichedEntryPointCandidate[];
}>;

type ExtractedFeatures = Readonly<{
  count: number;
  top1Score: number;
  scoreGap: number;
  top1Support: number;
  hasExact: boolean;
  hasSymbol: boolean;
  semanticOnly: boolean;
  dirSpread: number;
}>;

function getSpread(candidates: readonly EnrichedEntryPointCandidate[]): number {
  const dirs = new Set(candidates.slice(0, 3).map((c) => c.candidate.relativePath.split('/')[0]));
  return dirs.size;
}

function extractFeatures(candidates: readonly EnrichedEntryPointCandidate[]): ExtractedFeatures {
  const [top1, top2] = candidates;
  const reasons = top1?.candidate.reasons ?? [];
  return {
    count: candidates.length,
    top1Score: top1?.candidate.score ?? 0,
    scoreGap: (top1?.candidate.score ?? 0) - (top2?.candidate.score ?? 0),
    top1Support: top1?.supportScore ?? 0,
    hasExact: reasons.includes('exactFilenameMatch') || reasons.includes('filenameMatch'),
    hasSymbol: reasons.includes('symbolLikeMatch'),
    semanticOnly: reasons.length === 1 && reasons[0] === 'semanticMatch',
    dirSpread: getSpread(candidates),
  };
}

function evaluateLow(f: ExtractedFeatures): { isLow: boolean; reasons: ContextConfidenceReason[] } {
  const reasons: ContextConfidenceReason[] = [];
  if (f.count === 0) return { isLow: true, reasons: ['weakStructuralSupport', 'distributedCandidates'] };
  if (f.semanticOnly) reasons.push('semanticOnly');
  if (f.count > 1 && f.scoreGap < 8) reasons.push('closeCandidateScores');
  if (f.dirSpread >= 3) reasons.push('distributedCandidates');
  if (f.top1Support < 15) reasons.push('weakStructuralSupport');
  return { isLow: reasons.length > 0, reasons };
}

function evaluateHigh(f: ExtractedFeatures): { isHigh: boolean; reasons: ContextConfidenceReason[] } {
  if (f.count === 0 || f.top1Score < 80 || f.scoreGap < 20 || f.top1Support < 25 || f.dirSpread > 1) {
    return { isHigh: false, reasons: [] };
  }
  const reasons: ContextConfidenceReason[] = ['largeScoreGap', 'strongStructuralSupport'];
  if (f.hasExact) reasons.push('strongExactMatch');
  if (f.hasSymbol) reasons.push('strongSymbolMatch');
  const isHigh = f.hasExact || f.hasSymbol;
  return { isHigh, reasons: isHigh ? reasons : [] };
}

function calculateScore(level: ContextConfidenceLevel, f: ExtractedFeatures): number {
  if (level === 'high') return Math.min(95, 80 + Math.round(f.scoreGap * 0.3) + Math.round(f.top1Support * 0.2));
  if (level === 'low') return Math.max(10, Math.min(44, Math.round(f.top1Score * 0.4)));
  return Math.min(74, Math.max(45, Math.round(f.top1Score * 0.5) + Math.round(f.top1Support * 0.3)));
}

export function evaluateContextConfidence(input: ConfidenceInput): ContextConfidence {
  const f = extractFeatures(input.candidates);
  const low = evaluateLow(f);
  if (low.isLow) {
    return createContextConfidence('low', calculateScore('low', f), low.reasons);
  }
  const high = evaluateHigh(f);
  if (high.isHigh) {
    return createContextConfidence('high', calculateScore('high', f), high.reasons);
  }
  return createContextConfidence('medium', calculateScore('medium', f), ['strongStructuralSupport']);
}

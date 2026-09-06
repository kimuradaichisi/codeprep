// src/features/repository-context/domain/CandidateSupportScorer.ts
import type { CandidateEvidence, CandidateEvidenceKind } from './CandidateEvidence';

export const EVIDENCE_WEIGHT_TABLE: Readonly<Record<CandidateEvidenceKind, number>> = {
  dependency: 20,
  relatedTest: 20,
  gitCoChange: 15,
  symbolSupport: 15,
  directoryProximity: 10,
  markdownLink: 10,
};

export const EVIDENCE_CAP_TABLE: Readonly<Record<CandidateEvidenceKind, number>> = {
  dependency: 2,
  relatedTest: 2,
  gitCoChange: 2,
  symbolSupport: 2,
  directoryProximity: 1,
  markdownLink: 2,
};

export const MAX_SUPPORT_SCORE = 100;

export function calculateCandidateSupportScore(evidences: readonly CandidateEvidence[]): number {
  const counts: Partial<Record<CandidateEvidenceKind, number>> = {};
  let totalScore = 0;

  for (const evidence of evidences) {
    const currentCount = counts[evidence.kind] ?? 0;
    const maxCount = EVIDENCE_CAP_TABLE[evidence.kind];
    if (currentCount < maxCount) {
      counts[evidence.kind] = currentCount + 1;
      totalScore += EVIDENCE_WEIGHT_TABLE[evidence.kind];
    }
  }

  return Math.min(MAX_SUPPORT_SCORE, totalScore);
}

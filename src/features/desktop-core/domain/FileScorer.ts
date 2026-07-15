import type { CandidateReason } from './CandidateFile';

export type ScoreCandidateInput = Readonly<{
  reasons: readonly CandidateReason[];
  manualPin: boolean;
}>;

export type ScoredCandidate = Readonly<{
  score: number;
  reasons: readonly CandidateReason[];
}>;

const reasonWeights: Readonly<Record<CandidateReason, number>> = {
  rgMatch: 35,
  gitModified: 30,
  recentCommit: 20,
  pathAffinity: 15,
  fileTypeBoost: 10,
  manualPin: 100,
  clipboardPath: 25,
  extensionMatch: 10,
  directoryMatch: 15,
  gitCommit: 30,
  dependency: 5,
  excluded: -1000,
};

export const scoreCandidate = (
  candidate: ScoreCandidateInput,
): ScoredCandidate => {
  const reasons = explainScoreReasons(candidate);

  return {
    score: scoreReasons(reasons),
    reasons,
  };
};

const explainScoreReasons = (
  candidate: ScoreCandidateInput,
): readonly CandidateReason[] => {
  const reasons = candidate.reasons.filter(isInputScoreReason);

  return candidate.manualPin ? [...reasons, 'manualPin'] : reasons;
};

const isInputScoreReason = (reason: CandidateReason): boolean =>
  reason !== 'manualPin';

const scoreReasons = (reasons: readonly CandidateReason[]): number =>
  reasons.reduce((total, reason) => total + reasonWeights[reason], 0);

import type { ProjectId } from './Project';
import type { ContextRole } from './ContextRole';
import type { CandidateReason } from './CandidateFile';
import type { RecommendationReason } from './Recommendation';
import type { PackMode } from './PackMode';
import type { SourceExcerpt } from './SourceExcerpt';

export type ContextEntry = Readonly<{
  projectId: ProjectId;
  relativePath: string;
  role: ContextRole;
  candidateReasons: readonly CandidateReason[];
  recommendationReasons: readonly RecommendationReason[];
  score: number;
  packMode: PackMode;
  excerpts?: readonly SourceExcerpt[];
}>;

export const createContextEntry = (
  projectId: ProjectId,
  relativePath: string,
  role: ContextRole,
  candidateReasons: readonly CandidateReason[],
  recommendationReasons: readonly RecommendationReason[],
  score: number,
  packMode: PackMode,
  excerpts?: readonly SourceExcerpt[]
): ContextEntry => Object.freeze({
  projectId,
  relativePath,
  role,
  candidateReasons: Object.freeze([...candidateReasons]),
  recommendationReasons: Object.freeze([...recommendationReasons]),
  score,
  packMode,
  ...(excerpts && excerpts.length > 0 ? { excerpts: Object.freeze([...excerpts]) } : {}),
});

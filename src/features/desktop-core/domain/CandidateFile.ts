import type { ProjectId } from './Project';
import type { SourceExcerpt } from './SourceExcerpt';

export type CandidateReason =
  | 'rgMatch'
  | 'gitModified'
  | 'recentCommit'
  | 'pathAffinity'
  | 'fileTypeBoost'
  | 'manualPin'
  | 'clipboardPath'
  | 'extensionMatch'
  | 'directoryMatch'
  | 'gitCommit'
  | 'excluded';

export type CandidateFile = Readonly<{
  projectId: ProjectId;
  relativePath: string;
  reasons: readonly CandidateReason[];
  excluded: boolean;
  excerpts?: readonly SourceExcerpt[];
}>;

export const createCandidateFile = (
  projectId: ProjectId,
  relativePath: string,
  reasons: readonly CandidateReason[],
  excerpts?: readonly SourceExcerpt[],
): CandidateFile => ({
  projectId,
  relativePath,
  reasons: [...reasons],
  excluded: reasons.includes('excluded'),
  excerpts,
});

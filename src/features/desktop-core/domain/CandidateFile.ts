import type { ProjectId } from './Project';

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
}>;

export const createCandidateFile = (
  projectId: ProjectId,
  relativePath: string,
  reasons: readonly CandidateReason[],
): CandidateFile => ({
  projectId,
  relativePath,
  reasons: [...reasons],
  excluded: reasons.includes('excluded'),
});

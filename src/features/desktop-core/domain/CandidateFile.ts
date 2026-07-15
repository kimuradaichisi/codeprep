import type { ProjectId } from './Project';
import type { SourceExcerpt } from './SourceExcerpt';

import type { PackMode } from './PackMode';

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
  | 'dependency'
  | 'excluded';

export type CandidateFile = Readonly<{
  projectId: ProjectId;
  relativePath: string;
  reasons: readonly CandidateReason[];
  excluded: boolean;
  excerpts?: readonly SourceExcerpt[];
  size?: number;
  packMode?: PackMode;
}>;

export const createCandidateFile = (
  projectId: ProjectId,
  relativePath: string,
  reasons: readonly CandidateReason[],
  excerpts?: readonly SourceExcerpt[],
  size?: number,
): CandidateFile => ({
  projectId,
  relativePath,
  reasons: [...reasons],
  excluded: reasons.includes('excluded'),
  excerpts,
  size,
});

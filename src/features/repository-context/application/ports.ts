// src/features/repository-context/application/ports.ts
import type { CandidateFile } from '../domain/CandidateFile';
import type { Project, ProjectId } from '../domain/Project';
import type { SourceExcerpt } from '../domain/SourceExcerpt';
import type { RecommendationReason } from '../domain/Recommendation';

export type AnalysisWarningKind =
  | 'missingRg'
  | 'rgFailure'
  | 'gitFailure'
  | 'unreadableFile'
  | 'oversizedFile'
  | 'invalidRoot'
  | 'outsideProject'
  | 'missingExcerpt'
  | 'recommendationFailure';

export type AnalysisWarning = Readonly<{
  kind: AnalysisWarningKind;
  projectId: ProjectId;
  relativePath?: string;
  message: string;
}>;

export type RipgrepMatch = Readonly<{
  relativePath: string;
  excerpts?: readonly SourceExcerpt[];
}>;

export type RipgrepResult = Readonly<{
  matches: readonly RipgrepMatch[];
  warning?: AnalysisWarning;
}>;

export type GitMetadata = Readonly<{
  modifiedPaths: readonly string[];
  recentPaths: readonly string[];
  warning?: AnalysisWarning;
}>;

export type AnalyzedCandidate = CandidateFile &
  Readonly<{
    score: number;
    recommendationReasons?: readonly RecommendationReason[];
  }>;

export type AnalyzeProjectsInput = Readonly<{
  query: string;
  projectIds: readonly ProjectId[];
  contextLines: number;
}>;

export type AnalyzeProjectsResult = Readonly<{
  candidates: readonly AnalyzedCandidate[];
  warnings: readonly AnalysisWarning[];
}>;

export type ProjectRegistryPort = Readonly<{
  getByIds(projectIds: readonly ProjectId[]): Promise<readonly Project[]>;
}>;

export type RipgrepPort = Readonly<{
  search(project: Project, query: string, contextLines: number): Promise<RipgrepResult>;
}>;

export type GitMetadataPort = Readonly<{
  getMetadata(project: Project): Promise<GitMetadata>;
}>;

export type FileContentPort = Readonly<{
  canRead(project: Project, relativePath: string): Promise<boolean>;
  read(project: Project, relativePath: string): Promise<string | undefined>;
}>;

export type FileSizePort = Readonly<{
  getSize(project: Project, relativePath: string): Promise<number>;
}>;

export type ProjectFilePort = Readonly<{
  list(project: Project): Promise<readonly Readonly<{ relativePath: string; size: number }>[]>;
}>;

export type ClipboardPathPort = Readonly<{
  readText(): Promise<string>;
}>;

export type GitHistoryPort = Readonly<{
  getCommitPaths(project: Project, ref: string): Promise<Readonly<{ paths: readonly string[]; warning?: AnalysisWarning }>>;
}>;

export type AnalyzeProjectsPorts = Readonly<{
  projects: ProjectRegistryPort;
  ripgrep: RipgrepPort;
  gitMetadata: GitMetadataPort;
  fileContent: FileContentPort;
  fileSize: FileSizePort;
}>;

export * from './buildContextPorts';
export * from './discoverFilesPorts';

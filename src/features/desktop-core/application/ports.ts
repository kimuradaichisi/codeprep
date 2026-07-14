import type { CandidateFile } from '../domain/CandidateFile';
import type { Project, ProjectId } from '../domain/Project';
import type { SearchRecipe } from '../domain/SearchRecipe';
import type { PackMode } from '../domain/PackMode';
import type { ContextBudget } from '../domain/ContextBudget';
import type { SourceExcerpt } from '../domain/SourceExcerpt';

export type AnalysisWarningKind =
  | 'missingRg'
  | 'rgFailure'
  | 'gitFailure'
  | 'unreadableFile'
  | 'oversizedFile'
  | 'invalidRoot'
  | 'outsideProject'
  | 'missingExcerpt';

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

export type AnalyzeProjectsPorts = Readonly<{
  projects: ProjectRegistryPort;
  ripgrep: RipgrepPort;
  gitMetadata: GitMetadataPort;
  fileContent: FileContentPort;
  fileSize: FileSizePort;
}>;

export type ContextOutputFormat = 'markdown' | 'xml' | 'json';

export type DesktopContextFile = Readonly<{
  relativePath: string;
  content: string;
}>;

export type ContextFormatterPort = Readonly<{
  format(input: Readonly<{ format: ContextOutputFormat; files: readonly DesktopContextFile[] }>): string;
}>;

export type BuildDesktopContextInput = Readonly<{
  candidates: readonly CandidateFile[];
  format: ContextOutputFormat;
  maxFileSizeKB: number;
  packMode?: PackMode;
  tokenLimit?: number;
  includeDependencies?: boolean;
  autoOptimize?: boolean;
}>;

export type ContextManifestEntry = Readonly<{
  projectId: ProjectId;
  relativePath: string;
  included: boolean;
  reasons: readonly string[];
}>;

export type BuildDesktopContextResult = Readonly<{
  preview: string;
  warnings: readonly AnalysisWarning[];
  budget?: ContextBudget;
  manifest?: readonly ContextManifestEntry[];
}>;

export type BuildDesktopContextPorts = Readonly<{
  projects: ProjectRegistryPort;
  fileContent: FileContentPort;
  formatter: ContextFormatterPort;
}>;

export type ProjectFilePort = Readonly<{
  list(project: Project): Promise<readonly string[]>;
}>;

export type ClipboardPathPort = Readonly<{
  readText(): Promise<string>;
}>;

export type GitHistoryPort = Readonly<{
  getCommitPaths(project: Project, ref: string): Promise<Readonly<{ paths: readonly string[]; warning?: AnalysisWarning }>>;
}>;

export type DiscoverFilesInput = Readonly<{
  recipe: SearchRecipe;
  projectIds: readonly ProjectId[];
}>;

export type DiscoverFilesPorts = Readonly<{
  projects: ProjectRegistryPort;
  ripgrep: RipgrepPort;
  gitMetadata: GitMetadataPort;
  files: ProjectFilePort;
  clipboard: ClipboardPathPort;
  gitHistory: GitHistoryPort;
  fileSize: FileSizePort;
}>;

export type FileSizePort = Readonly<{
  getSize(project: Project, relativePath: string): Promise<number>;
}>;

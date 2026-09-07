import type {
  AnalyzeProjectsInput,
  AnalyzeProjectsResult,
  AnalyzedCandidate,
  BuildDesktopContextInput,
  ContextOutputFormat,
  DiscoverFilesInput,
} from '../../src/features/repository-context/application/ports';
import type { ContextManifest } from '../../src/features/repository-context/domain/ContextManifest';
import type { EntryPointCandidate } from '../../src/features/repository-context/domain/EntryPointCandidate';
import type { EnrichedEntryPointCandidate } from '../../src/features/repository-context/domain/CandidateEvidence';
import type { Project } from '../../src/features/repository-context/domain/Project';

import type { ContextConfidence, AdaptivePackMode } from '../../src/features/repository-context/domain/ContextConfidence';

export type DesktopOutput = Readonly<{
  preview: string;
  warning?: string;
  manifest?: readonly Readonly<{ projectId: string; relativePath: string; included: boolean; reasons: readonly string[] }>[];
}>;

export type BuildTaskContextRequest = Readonly<{
  projectId: string;
  task: string;
  entryPoints: readonly string[];
  tokenLimit?: number;
  strategy?: AdaptivePackMode | 'auto';
}>;

export type DiscoverEntryPointCandidatesRequest = Readonly<{
  projectId: string;
  task: string;
  maxCandidates?: number;
  manualPinnedPaths?: readonly string[];
}>;

export type DiscoverEntryPointCandidatesResponse = Readonly<{
  candidates: readonly EntryPointCandidate[];
  enrichedCandidates?: readonly EnrichedEntryPointCandidate[];
  confidence?: ContextConfidence;
  suggestedPackStrategy?: AdaptivePackMode;
  terms: readonly string[];
  warnings: readonly string[];
}>;

export type DesktopTaskContextResult = Readonly<{
  manifest: ContextManifest;
  markdown: string;
  candidates: readonly AnalyzedCandidate[];
  warnings: readonly string[];
}>;

export type SaveOutputRequest = Readonly<{
  content: string;
  format: ContextOutputFormat;
}>;

export type SaveOutputResult =
  | Readonly<{
      status: 'saved';
      filePath: string;
    }>
  | Readonly<{
      status: 'cancelled';
    }>;

export type RepositoryIndexStatus = 'ready' | 'updating' | 'degraded' | 'not_indexed';

export type StructuredKnowledgeIndexStatus = 'ready' | 'building' | 'degraded' | 'not_built';

export type SemanticIndexStatus = 'ready' | 'building' | 'degraded' | 'not_built';

export type RepositoryIndexStatusResponse = Readonly<{
  status: RepositoryIndexStatus;
  totalFiles: number;
  updatedAt?: string;
  schemaVersion?: number;
  knowledgeStatus?: StructuredKnowledgeIndexStatus;
  knowledgeEntries?: number;
  semanticStatus?: SemanticIndexStatus;
  semanticEntries?: number;
}>;

export type RefreshRepositoryIndexResponse = Readonly<{
  status: RepositoryIndexStatus;
  metrics?: {
    totalFiles: number;
    added: number;
    modified: number;
    deleted: number;
    unchanged: number;
  };
  rebuilt: boolean;
  knowledgeStatus?: StructuredKnowledgeIndexStatus;
  knowledgeEntries?: number;
  semanticStatus?: SemanticIndexStatus;
  semanticEntries?: number;
}>;

export type DesktopApi = Readonly<{
  chooseProjectFolder(): Promise<string | undefined>;
  listProjectFiles(projectId: string, options?: { useGitignore?: boolean }): Promise<readonly Readonly<{ relativePath: string; size: number }>[]>;
  listProjects(): Promise<readonly Project[]>;
  addProject(rootPath: string): Promise<readonly Project[]>;
  removeProject(projectId: string): Promise<readonly Project[]>;
  analyzeProjects(input: AnalyzeProjectsInput): Promise<AnalyzeProjectsResult>;
  discoverFiles(input: DiscoverFilesInput): Promise<AnalyzeProjectsResult>;
  generateOutput(input: BuildDesktopContextInput): Promise<DesktopOutput>;
  copyOutput(text: string): Promise<void>;
  saveOutput(request: SaveOutputRequest): Promise<SaveOutputResult>;
  readFileContent(projectId: string, relativePath: string): Promise<string>;
  buildTaskContext(request: BuildTaskContextRequest): Promise<DesktopTaskContextResult>;
  discoverEntryPointCandidates(request: DiscoverEntryPointCandidatesRequest): Promise<DiscoverEntryPointCandidatesResponse>;
  getRepositoryIndexStatus(workspaceId: string): Promise<RepositoryIndexStatusResponse>;
  refreshRepositoryIndex(workspaceId: string): Promise<RefreshRepositoryIndexResponse>;
}>;

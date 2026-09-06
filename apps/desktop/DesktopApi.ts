import type {
  AnalyzeProjectsInput,
  AnalyzeProjectsResult,
  AnalyzedCandidate,
  BuildDesktopContextInput,
  ContextOutputFormat,
  DiscoverFilesInput,
} from '../../src/features/repository-context/application/ports';
import type { ContextManifest } from '../../src/features/repository-context/domain/ContextManifest';
import type { Project } from '../../src/features/repository-context/domain/Project';

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
}>;

import type {
  AnalyzeProjectsInput,
  AnalyzeProjectsResult,
  BuildDesktopContextInput,
  DiscoverFilesInput,
} from '../../src/features/desktop-core/application/ports';
import type { Project } from '../../src/features/desktop-core/domain/Project';

export type DesktopOutput = Readonly<{
  preview: string;
  warning?: string;
  manifest?: readonly Readonly<{ projectId: string; relativePath: string; included: boolean; reasons: readonly string[] }>[];
}>;

export type DesktopApi = Readonly<{
  chooseProjectFolder(): Promise<string | undefined>;
  listProjectFiles(projectId: string): Promise<readonly string[]>;
  listProjects(): Promise<readonly Project[]>;
  addProject(rootPath: string): Promise<readonly Project[]>;
  removeProject(projectId: string): Promise<readonly Project[]>;
  analyzeProjects(input: AnalyzeProjectsInput): Promise<AnalyzeProjectsResult>;
  discoverFiles(input: DiscoverFilesInput): Promise<AnalyzeProjectsResult>;
  generateOutput(input: BuildDesktopContextInput): Promise<DesktopOutput>;
  copyOutput(text: string): Promise<void>;
}>;

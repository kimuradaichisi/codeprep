import type { DesktopApi } from '../DesktopApi';
import type { AnalyzedCandidate, ContextOutputFormat } from '../../../src/features/desktop-core/application/ports';
import type { Project } from '../../../src/features/desktop-core/domain/Project';
import type { CandidateTreeNode } from './model/candidateTree';
import type { SearchRecipeKind } from '../../../src/features/desktop-core/domain/SearchRecipe';
import type { PackMode } from '../../../src/features/desktop-core/domain/PackMode';

declare global {
  interface Window {
    codeprep?: DesktopApi;
  }
}

export type AppProps = Readonly<{
  api?: DesktopApi;
}>;

export type WorkspaceNotice = string | undefined;

export type ProjectPanelProps = Readonly<{
  projects: readonly Project[];
  projectNotice: WorkspaceNotice;
  addProject(rootPath: string): Promise<void>;
  chooseProjectFolder(): Promise<void>;
  removeProject(projectId: string): Promise<void>;
}>;

export type SearchPanelProps = Readonly<{
  recipeKind: SearchRecipeKind;
  query: string;
  contextLines: number;
  searchNotice: WorkspaceNotice;
  setRecipeKind(value: SearchRecipeKind): void;
  setQuery(value: string): void;
  setContextLines(value: number): void;
  analyze(query?: string): Promise<void>;
  clearSearch(): Promise<void>;
}>;

export type CandidateTreeProps = Readonly<{
  tree: readonly CandidateTreeNode[];
  candidates?: readonly AnalyzedCandidate[];
  selectedKeys: readonly string[];
  toggleTreeNode(root: CandidateTreeNode, nodeId: string): void;
  selectAll(): void;
  clearAll(): void;
  viewFile(projectId: string, relativePath: string): void;
  setFilePackMode(projectId: string, relativePath: string, mode: PackMode | undefined): void;
}>;

export type OutputPanelProps = Readonly<{
  packMode: PackMode;
  tokenLimit: number;
  format: ContextOutputFormat;
  preview: string;
  outputNotice: WorkspaceNotice;
  includeDependencies: boolean;
  autoOptimize: boolean;
  setFormat(value: ContextOutputFormat): void;
  setPackMode(value: PackMode): void;
  setTokenLimit(value: number): void;
  setIncludeDependencies(value: boolean): void;
  setAutoOptimize(value: boolean): void;
  generateOutput(): Promise<void>;
  copyOutput(): Promise<void>;
}>;

export type DesktopWorkspace = Readonly<{
  recipeKind: SearchRecipeKind;
  projects: readonly Project[];
  query: string;
  contextLines: number;
  candidates: readonly AnalyzedCandidate[];
  selectedKeys: readonly string[];
  format: ContextOutputFormat;
  packMode: PackMode;
  tokenLimit: number;
  preview: string;
  includeDependencies: boolean;
  autoOptimize: boolean;
  tree: readonly CandidateTreeNode[];
  projectNotice: WorkspaceNotice;
  searchNotice: WorkspaceNotice;
  outputNotice: WorkspaceNotice;
  activePreviewFile?: Readonly<{ projectId: string; relativePath: string }>;
  projectPanel: ProjectPanelProps;
  searchPanel: SearchPanelProps;
  treePanel: CandidateTreeProps;
  outputPanel: OutputPanelProps;
  setQuery(value: string): void;
  setRecipeKind(value: SearchRecipeKind): void;
  setFormat(value: ContextOutputFormat): void;
  setPackMode(value: PackMode): void;
  setTokenLimit(value: number): void;
  setContextLines(value: number): void;
  setIncludeDependencies(value: boolean): void;
  setAutoOptimize(value: boolean): void;
  viewFile(projectId: string, relativePath: string): void;
  closeFile(): void;
  addProject(rootPath: string): Promise<void>;
  chooseProjectFolder(): Promise<void>;
  removeProject(projectId: string): Promise<void>;
  analyze(query?: string): Promise<void>;
  clearSearch(): Promise<void>;
  toggleTreeNode(root: CandidateTreeNode, nodeId: string): void;
  generateOutput(): Promise<void>;
  copyOutput(): Promise<void>;
  setFilePackMode(projectId: string, relativePath: string, mode: PackMode | undefined): void;
}>;


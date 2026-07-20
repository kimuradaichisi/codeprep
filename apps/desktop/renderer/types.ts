import type { ReactNode } from 'react';
import type { DesktopApi } from '../DesktopApi';
import type { AnalyzedCandidate, ContextOutputFormat } from '../../../src/features/desktop-core/application/ports';
import type { Project } from '../../../src/features/desktop-core/domain/Project';
import type { CandidateTreeNode, TreeSort } from './model/candidateTree';
import type { SearchRecipeKind } from '../../../src/features/desktop-core/domain/SearchRecipe';
import type { PackMode } from '../../../src/features/desktop-core/domain/PackMode';
import type { RecommendationSettings } from '../../../src/features/desktop-core/domain/Recommendation';

declare global {
  interface Window {
    codeprep?: DesktopApi;
  }
}

export type AppProps = Readonly<{
  api?: DesktopApi;
}>;
export type AppShellProps = Readonly<{
  projects: ReactNode;
  search: ReactNode;
  tree: ReactNode;
  output: ReactNode;
  isProjectsOpen: boolean;
  toggleProjects(): void;
}>;

export type WorkspaceNotice = string | undefined;
export type ScenarioPresetKind = 'custom' | 'initialShare' | 'debugFix' | 'newFeature';
export type OutputTab = 'preview' | 'help';

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
  presetKind: ScenarioPresetKind;
  useGitignore: boolean;
  recommendationSettings: RecommendationSettings;
  setRecipeKind(value: SearchRecipeKind): void;
  setQuery(value: string): void;
  setContextLines(value: number): void;
  setPresetKind(value: ScenarioPresetKind): void;
  setUseGitignore(value: boolean): void;
  setRecommendationSettings(value: RecommendationSettings): void;
  analyze(query?: string): Promise<void>;
  clearSearch(): Promise<void>;
}>;

export type CandidateTreeProps = Readonly<{
  tree: readonly CandidateTreeNode[];
  candidates?: readonly AnalyzedCandidate[];
  selectedKeys: readonly string[];
  tokenLimit: number;
  sortKey: TreeSort;
  setSortKey(value: TreeSort): void;
  favorites: readonly string[];
  favoritesOnly: boolean;
  toggleTreeNode(root: CandidateTreeNode, nodeId: string): void;
  selectAll(): void;
  clearAll(): void;
  viewFile(projectId: string, relativePath: string): void;
  setFilePackMode(projectId: string, relativePath: string, mode: PackMode | undefined): void;
  setFavoritesOnly(value: boolean): void;
  toggleFavorite(projectId: string, relativePath: string): void;
}>;
export type OutputPanelProps = Readonly<{
  packMode: PackMode;
  tokenLimit: number;
  format: ContextOutputFormat;
  preview: string;
  outputNotice: WorkspaceNotice;
  includeDependencies: boolean;
  includeRelatedDocs: boolean;
  autoOptimize: boolean;
  activeTab: OutputTab;
  setFormat(value: ContextOutputFormat): void;
  setPackMode(value: PackMode): void;
  setTokenLimit(value: number): void;
  setIncludeDependencies(value: boolean): void;
  setIncludeRelatedDocs(value: boolean): void;
  setAutoOptimize(value: boolean): void;
  setActiveTab(value: OutputTab): void;
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
  includeRelatedDocs: boolean;
  autoOptimize: boolean;
  presetKind: ScenarioPresetKind;
  activeTab: OutputTab;
  isProjectsOpen: boolean;
  useGitignore: boolean;
  recommendationSettings: RecommendationSettings;
  favorites: readonly string[];
  favoritesOnly: boolean;
  sortKey: TreeSort;
  setSortKey(value: TreeSort): void;
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
  setIncludeRelatedDocs(value: boolean): void;
  setAutoOptimize(value: boolean): void;
  setPresetKind(value: ScenarioPresetKind): void;
  setActiveTab(value: OutputTab): void;
  setUseGitignore(value: boolean): void;
  setRecommendationSettings(value: RecommendationSettings): void;
  setFavoritesOnly(value: boolean): void;
  toggleProjects(): void;
  toggleFavorite(projectId: string, relativePath: string): void;
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


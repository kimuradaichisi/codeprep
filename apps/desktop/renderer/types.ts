import type { ReactNode } from 'react';
import type { DesktopApi } from '../DesktopApi';
import type { AnalyzedCandidate, ContextOutputFormat } from '../../../src/features/repository-context/application/ports';
import type { Project } from '../../../src/features/repository-context/domain/Project';
import type { EntryPointCandidate } from '../../../src/features/repository-context/domain/EntryPointCandidate';
import type { CandidateTreeNode, TreeSort } from './model/candidateTree';
import type { SearchRecipeKind } from '../../../src/features/repository-context/domain/SearchRecipe';
import type { PackMode } from '../../../src/features/repository-context/domain/PackMode';
import type { RecommendationSettings } from '../../../src/features/repository-context/domain/Recommendation';

declare global {
  interface Window { codeprep?: DesktopApi; }
}

export type AppProps = Readonly<{ api?: DesktopApi }>;
export type AppShellProps = Readonly<{
  projects: ReactNode; search: ReactNode; tree: ReactNode; output: ReactNode;
  isProjectsOpen: boolean; toggleProjects(): void;
}>;

export type WorkspaceNotice = string | undefined;
export type ScenarioPresetKind = 'custom' | 'initialShare' | 'debugFix' | 'newFeature';
export type OutputTab = 'preview' | 'help';
export type DiscoveryMode = 'search' | 'task';

export type ProjectPanelProps = Readonly<{
  projects: readonly Project[]; projectNotice: WorkspaceNotice;
  indexStatus?: string; indexTotalFiles?: number;
  knowledgeStatus?: string; knowledgeEntries?: number;
  semanticStatus?: string; semanticEntries?: number;
  addProject(rootPath: string): Promise<void>; chooseProjectFolder(): Promise<void>; removeProject(projectId: string): Promise<void>;
  refreshIndex?(): Promise<void>;
}>;

export type SearchPanelProps = Readonly<{
  discoveryMode: DiscoveryMode; taskInput: string; entryPointInput: string;
  recipeKind: SearchRecipeKind; query: string; contextLines: number; searchNotice: WorkspaceNotice;
  presetKind: ScenarioPresetKind; useGitignore: boolean; recommendationSettings: RecommendationSettings;
  isAnalyzing?: boolean;
  entryPointCandidates?: readonly EntryPointCandidate[];
  isDiscoveringEntryPoints?: boolean;
  setDiscoveryMode(value: DiscoveryMode): void; setTaskInput(value: string): void; setEntryPointInput(value: string): void;
  setRecipeKind(value: SearchRecipeKind): void; setQuery(value: string): void; setContextLines(value: number): void;
  setPresetKind(value: ScenarioPresetKind): void; setUseGitignore(value: boolean): void;
  setRecommendationSettings(value: RecommendationSettings): void; analyze(query?: string): Promise<void>;
  analyzeTask(): Promise<void>; discoverEntryPoints?(): Promise<void>;
  toggleEntryPointCandidate?(relativePath: string): void; clearSearch(): Promise<void>;
}>;

export type CandidateTreeProps = Readonly<{
  tree: readonly CandidateTreeNode[]; candidates?: readonly AnalyzedCandidate[]; selectedKeys: readonly string[];
  tokenLimit: number; sortKey: TreeSort; setSortKey(value: TreeSort): void; favorites: readonly string[]; favoritesOnly: boolean;
  isLoading?: boolean;
  toggleTreeNode(root: CandidateTreeNode, nodeId: string): void; selectAll(): void; clearAll(): void;
  viewFile(projectId: string, relativePath: string): void;
  setFilePackMode(projectId: string, relativePath: string, mode: PackMode | undefined): void;
  setFavoritesOnly(value: boolean): void; toggleFavorite(projectId: string, relativePath: string): void;
}>;

export type OutputPanelProps = Readonly<{
  packMode: PackMode; tokenLimit: number; format: ContextOutputFormat; preview: string; outputNotice: WorkspaceNotice;
  includeDependencies: boolean; includeRelatedDocs: boolean; autoOptimize: boolean; activeTab: OutputTab; isSaving: boolean;
  isGenerating?: boolean;
  setFormat(value: ContextOutputFormat): void; setPackMode(value: PackMode): void; setTokenLimit(value: number): void;
  setIncludeDependencies(value: boolean): void; setIncludeRelatedDocs(value: boolean): void; setAutoOptimize(value: boolean): void;
  setActiveTab(value: OutputTab): void; generateOutput(): Promise<void>; copyOutput(): Promise<void>; saveOutput(): Promise<void>;
}>;

export type DesktopWorkspace = Readonly<{
  discoveryMode: DiscoveryMode; taskInput: string; entryPointInput: string;
  recipeKind: SearchRecipeKind; projects: readonly Project[]; query: string; contextLines: number;
  candidates: readonly AnalyzedCandidate[]; selectedKeys: readonly string[]; format: ContextOutputFormat;
  packMode: PackMode; tokenLimit: number; preview: string; includeDependencies: boolean;
  includeRelatedDocs: boolean; autoOptimize: boolean; presetKind: ScenarioPresetKind; activeTab: OutputTab;
  isProjectsOpen: boolean; useGitignore: boolean; recommendationSettings: RecommendationSettings;
  favorites: readonly string[]; favoritesOnly: boolean; sortKey: TreeSort; isSaving: boolean;
  isAnalyzing: boolean; isGenerating: boolean;
  setSortKey(value: TreeSort): void; tree: readonly CandidateTreeNode[]; projectNotice: WorkspaceNotice;
  searchNotice: WorkspaceNotice; outputNotice: WorkspaceNotice;
  activePreviewFile?: Readonly<{ projectId: string; relativePath: string }>;
  projectPanel: ProjectPanelProps; searchPanel: SearchPanelProps; treePanel: CandidateTreeProps; outputPanel: OutputPanelProps;
  setDiscoveryMode(value: DiscoveryMode): void; setTaskInput(value: string): void; setEntryPointInput(value: string): void;
  setQuery(value: string): void; setRecipeKind(value: SearchRecipeKind): void; setFormat(value: ContextOutputFormat): void;
  setPackMode(value: PackMode): void; setTokenLimit(value: number): void; setContextLines(value: number): void;
  setIncludeDependencies(value: boolean): void; setIncludeRelatedDocs(value: boolean): void; setAutoOptimize(value: boolean): void;
  setPresetKind(value: ScenarioPresetKind): void; setActiveTab(value: OutputTab): void; setUseGitignore(value: boolean): void;
  setRecommendationSettings(value: RecommendationSettings): void; setFavoritesOnly(value: boolean): void;
  toggleProjects(): void; toggleFavorite(projectId: string, relativePath: string): void;
  viewFile(projectId: string, relativePath: string): void; closeFile(): void;
  addProject(rootPath: string): Promise<void>; chooseProjectFolder(): Promise<void>; removeProject(projectId: string): Promise<void>;
  analyze(query?: string): Promise<void>; analyzeTask(): Promise<void>; clearSearch(): Promise<void>;
  toggleTreeNode(root: CandidateTreeNode, nodeId: string): void;
  generateOutput(): Promise<void>; copyOutput(): Promise<void>; saveOutput(): Promise<void>;
  setFilePackMode(projectId: string, relativePath: string, mode: PackMode | undefined): void;
  entryPointCandidates?: readonly EntryPointCandidate[];
  isDiscoveringEntryPoints?: boolean;
  discoverEntryPoints?(): Promise<void>;
  toggleEntryPointCandidate?(relativePath: string): void;
}>;



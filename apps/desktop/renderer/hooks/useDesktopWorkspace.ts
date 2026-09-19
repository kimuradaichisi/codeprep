// apps/desktop/renderer/hooks/useDesktopWorkspace.ts
import { useEffect, useMemo, useState } from 'react';
import type { DesktopApi } from '../../DesktopApi';
import { buildCandidateTree, sortCandidateTree, toggleTreeNode as toggleNode } from '../model/candidateTree';
import type { CandidateTreeNode, TreeSort } from '../model/candidateTree';
import { candidateKey } from '../model/tokenBudget';
import type { DesktopWorkspace, ScenarioPresetKind, OutputTab, DiscoveryMode } from '../types';
import type { SearchRecipeKind } from '../../../../src/features/repository-context/domain/SearchRecipe';
import type { PackMode } from '../../../../src/features/repository-context/domain/PackMode';
import type { RecommendationSettings } from '../../../../src/features/repository-context/domain/Recommendation';
import { useWorkspaceRepositoryIndex } from './workspaceRepositoryIndex';
import { initialWorkspaceState, loadFavorites, update, type SetWorkspace, type WorkspaceState } from './workspaceState';
import { buildPresetPatch } from './workspacePresets';
import { handleDocGraphRelations } from './workspaceDocGraph';
import { analyze, chooseFolder, deleteProject, refreshProjects, saveProject } from './workspaceProjectActions';
import { analyzeTask, copyPackContent, discoverEntryPoints, resetTaskContext, toggleEntryPointCandidate } from './workspaceTaskActions';
import { clearSearch, copy, generate, save } from './workspaceOutputActions';

export const useDesktopWorkspace = (api: DesktopApi): DesktopWorkspace => {
  const [state, setState] = useState<WorkspaceState>(initialWorkspaceState);
  const [isProjectsOpen, setIsProjectsOpen] = useState(true);
  const [hasCheckedProjects, setHasCheckedProjects] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortKey, setSortKey] = useState<TreeSort>('name');
  const [favorites, setFavorites] = useState<readonly string[]>(loadFavorites);

  const filteredCandidates = useMemo(() => {
    if (!favoritesOnly) return state.candidates;
    return state.candidates.filter((c) => favorites.includes(candidateKey(c.projectId, c.relativePath)));
  }, [state.candidates, favorites, favoritesOnly]);

  const tree = useMemo(
    () => sortCandidateTree(buildCandidateTree(filteredCandidates, state.projects), sortKey),
    [filteredCandidates, state.projects, sortKey]
  );

  useEffect(() => { void refreshProjects(api, setState, state.useGitignore); }, [api, state.useGitignore]);
  useEffect(() => {
    if (state.projects.length > 0 && !hasCheckedProjects) {
      setIsProjectsOpen(false);
      setHasCheckedProjects(true);
    }
  }, [state.projects, hasCheckedProjects]);

  const toggleFavorite = (projectId: string, relativePath: string): void => {
    const key = candidateKey(projectId, relativePath);
    setFavorites((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      localStorage.setItem('codeprep:favorites', JSON.stringify(next));
      return next;
    });
  };

  const indexInfo = useWorkspaceRepositoryIndex(api);
  return buildWorkspace(api, state, setState, { tree, isProjectsOpen, setIsProjectsOpen, favorites, favoritesOnly, sortKey, setSortKey, toggleFavorite, setFavoritesOnly, indexInfo });
};

const buildWorkspace = (
  api: DesktopApi,
  state: WorkspaceState,
  set: SetWorkspace,
  ctx: Readonly<{
    tree: readonly CandidateTreeNode[];
    isProjectsOpen: boolean;
    setIsProjectsOpen: (fn: (prev: boolean) => boolean) => void;
    favorites: readonly string[];
    favoritesOnly: boolean;
    sortKey: TreeSort;
    setSortKey: (k: TreeSort) => void;
    toggleFavorite: (p: string, r: string) => void;
    setFavoritesOnly: (v: boolean) => void;
    indexInfo: ReturnType<typeof useWorkspaceRepositoryIndex>;
  }>
): DesktopWorkspace => {
  const actions = actionsFor(api, state, set);
  const selectAll = (): void => update(set, { selectedKeys: state.candidates.map((c) => candidateKey(c.projectId, c.relativePath)) });
  const clearAll = (): void => update(set, { selectedKeys: [] });
  const viewFile = (projectId: string, relativePath: string): void => update(set, { activePreviewFile: { projectId, relativePath } });
  const closeFile = (): void => update(set, { activePreviewFile: undefined });
  const setPresetKind = (p: ScenarioPresetKind): void => update(set, buildPresetPatch(p));
  const setFilePackMode = (p: string, r: string, m: PackMode | undefined): void => update(set, {
    candidates: state.candidates.map((c) => candidateKey(c.projectId, c.relativePath) === candidateKey(p, r) ? { ...c, packMode: m } : c),
  });
  const setIncludeRelatedDocs = (r: boolean): void => {
    update(set, { includeRelatedDocs: r });
    if (r) void handleDocGraphRelations(api, set, state.selectedKeys);
  };

  const treePanel = { tree: ctx.tree, candidates: state.candidates, selectedKeys: state.selectedKeys, tokenLimit: state.tokenLimit, sortKey: ctx.sortKey, setSortKey: ctx.setSortKey, favorites: ctx.favorites, favoritesOnly: ctx.favoritesOnly, isLoading: state.isAnalyzing, toggleTreeNode: actions.toggleTreeNode, selectAll, clearAll, viewFile, setFilePackMode, setFavoritesOnly: ctx.setFavoritesOnly, toggleFavorite: ctx.toggleFavorite };
  const projectPanel = { projects: state.projects, projectNotice: state.projectNotice, ...ctx.indexInfo, ...actions.project };
  const searchPanel = {
    discoveryMode: state.discoveryMode, taskInput: state.taskInput, entryPointInput: state.entryPointInput,
    setDiscoveryMode: (d: DiscoveryMode) => update(set, { discoveryMode: d }),
    setTaskInput: (t: string) => update(set, { taskInput: t }),
    setEntryPointInput: (e: string) => update(set, { entryPointInput: e }),
    recipeKind: state.recipeKind, query: state.query, contextLines: state.contextLines, searchNotice: state.searchNotice,
    presetKind: state.presetKind, useGitignore: state.useGitignore, recommendationSettings: state.recommendationSettings,
    isAnalyzing: state.isAnalyzing, entryPointCandidates: state.entryPointCandidates, enrichedCandidates: state.enrichedCandidates,
    confidence: state.confidence, suggestedPackStrategy: state.suggestedPackStrategy, adaptiveStrategy: state.adaptiveStrategy,
    setAdaptiveStrategy: (s: import('../../../../src/features/repository-context/domain/ContextConfidence').AdaptiveStrategyOverride) => update(set, { adaptiveStrategy: s }),
    isDiscoveringEntryPoints: state.isDiscoveringEntryPoints, workflowState: state.workflowState,
    packManifest: state.packManifest, packContent: state.packContent, resolvedStrategy: state.resolvedStrategy,
    contextPackV2: state.contextPackV2,
    preview: state.preview, activePreviewTab: state.activePreviewTab,
    setActivePreviewTab: (tab: import('../types').DesktopPreviewTab) => update(set, { activePreviewTab: tab }),
    indexStatus: ctx.indexInfo.indexStatus, semanticStatus: ctx.indexInfo.semanticStatus, knowledgeStatus: ctx.indexInfo.knowledgeStatus,
    knowledgeDbStatus: ctx.indexInfo.knowledgeDbStatus, knowledgeDbMessage: ctx.indexInfo.knowledgeDbMessage,
    setRecipeKind: (k: SearchRecipeKind) => update(set, { recipeKind: k }), setQuery: (q: string) => update(set, { query: q }),
    setContextLines: (c: number) => update(set, { contextLines: c }), setPresetKind, setUseGitignore: (u: boolean) => update(set, { useGitignore: u }),
    setRecommendationSettings: (r: RecommendationSettings) => update(set, { recommendationSettings: r }),
    analyze: actions.analyze, analyzeTask: actions.analyzeTask, discoverEntryPoints: actions.discoverEntryPoints,
    toggleEntryPointCandidate: actions.toggleEntryPointCandidate, clearSearch: actions.clearSearch,
    copyPackContent: (format?: 'content' | 'markdown' | 'json') => copyPackContent(api, set, state, format), resetTaskContext: () => resetTaskContext(set),
    refreshIndex: ctx.indexInfo.refreshIndex,
  };

  const outputPanel = { format: state.format, packMode: state.packMode, tokenLimit: state.tokenLimit, preview: state.preview, outputNotice: state.outputNotice, includeDependencies: state.includeDependencies, includeRelatedDocs: state.includeRelatedDocs, autoOptimize: state.autoOptimize, activeTab: state.activeTab, isSaving: state.isSaving, isGenerating: state.isGenerating, setFormat: (f: import('../../../../src/features/repository-context/application/ports').ContextOutputFormat) => update(set, { format: f }), setPackMode: (m: PackMode) => update(set, { packMode: m }), setTokenLimit: (l: number) => update(set, { tokenLimit: l }), setIncludeDependencies: (d: boolean) => update(set, { includeDependencies: d }), setIncludeRelatedDocs, setAutoOptimize: (o: boolean) => update(set, { autoOptimize: o }), setActiveTab: (t: OutputTab) => update(set, { activeTab: t }), ...actions.output };

  return { ...state, tree: ctx.tree, isProjectsOpen: ctx.isProjectsOpen, useGitignore: state.useGitignore, favorites: ctx.favorites, favoritesOnly: ctx.favoritesOnly, sortKey: ctx.sortKey, setSortKey: ctx.setSortKey, toggleProjects: () => ctx.setIsProjectsOpen((p) => !p), toggleFavorite: ctx.toggleFavorite, setDiscoveryMode: (d) => update(set, { discoveryMode: d }), setTaskInput: (t) => update(set, { taskInput: t }), setEntryPointInput: (e) => update(set, { entryPointInput: e }), setQuery: (q) => update(set, { query: q }), setRecipeKind: (k) => update(set, { recipeKind: k }), setFormat: (f) => update(set, { format: f }), setPackMode: (m) => update(set, { packMode: m }), setTokenLimit: (l) => update(set, { tokenLimit: l }), setContextLines: (c) => update(set, { contextLines: c }), setIncludeDependencies: (d) => update(set, { includeDependencies: d }), setIncludeRelatedDocs, setAutoOptimize: (o) => update(set, { autoOptimize: o }), setPresetKind, setActiveTab: (t) => update(set, { activeTab: t }), setUseGitignore: (u) => update(set, { useGitignore: u }), setRecommendationSettings: (r) => update(set, { recommendationSettings: r }), setFavoritesOnly: ctx.setFavoritesOnly, projectPanel, searchPanel, treePanel, outputPanel, ...actions.project, ...actions.output, analyze: actions.analyze, analyzeTask: actions.analyzeTask, discoverEntryPoints: actions.discoverEntryPoints, toggleEntryPointCandidate: actions.toggleEntryPointCandidate, clearSearch: actions.clearSearch, toggleTreeNode: actions.toggleTreeNode, viewFile, closeFile, setFilePackMode };
};

const actionsFor = (api: DesktopApi, state: WorkspaceState, set: SetWorkspace) => ({
  project: {
    addProject: (p: string) => saveProject(api, set, p, state.useGitignore),
    chooseProjectFolder: () => chooseFolder(api, set, state.useGitignore),
    removeProject: (id: string) => deleteProject(api, set, id, state.useGitignore),
  },
  analyze: (query = state.query) => analyze(api, set, query, state.recipeKind, state.contextLines, state.projects, state.recommendationSettings),
  analyzeTask: () => analyzeTask(api, set, state),
  discoverEntryPoints: () => discoverEntryPoints(api, set, state),
  toggleEntryPointCandidate: (path: string) => toggleEntryPointCandidate(set, path),
  clearSearch: () => clearSearch(api, set, state.projects, state.useGitignore),
  toggleTreeNode: (root: CandidateTreeNode, id: string) => {
    const nextKeys = toggleNode(root, id, state.selectedKeys);
    update(set, { selectedKeys: nextKeys });
    const added = nextKeys.filter((k) => !state.selectedKeys.includes(k));
    if (added.length > 0 && state.includeRelatedDocs) void handleDocGraphRelations(api, set, added);
  },
  output: {
    generateOutput: () => generate(api, set, state),
    copyOutput: () => copy(api, set, state.preview),
    saveOutput: () => save(api, set, state),
  },
});

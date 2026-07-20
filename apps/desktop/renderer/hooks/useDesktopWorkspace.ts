import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { AnalyzedCandidate, ContextOutputFormat } from '../../../../src/features/desktop-core/application/ports';
import type { DesktopApi, DesktopOutput } from '../../DesktopApi';
import { addProject, copyOutput, desktopErrorMessage, generateOutput, loadProjects, removeProject } from '../DesktopWorkflow';
import { buildCandidateTree, sortCandidateTree, toggleTreeNode as toggleNode } from '../model/candidateTree';
import type { CandidateTreeNode, TreeSort } from '../model/candidateTree';
import { candidateKey } from '../model/tokenBudget';
import type { DesktopWorkspace, ScenarioPresetKind, OutputTab } from '../types';
import type { SearchRecipeKind } from '../../../../src/features/desktop-core/domain/SearchRecipe';
import type { CandidateReason } from '../../../../src/features/desktop-core/domain/CandidateFile';
import type { PackMode } from '../../../../src/features/desktop-core/domain/PackMode';
import { defaultRecommendationSettings, type RecommendationSettings } from '../../../../src/features/desktop-core/domain/Recommendation';
import { selectedCandidates, fileCandidates, analyzeWorkspace } from './workspaceAnalysis';

type WorkspaceState = Readonly<{
  projects: DesktopWorkspace['projects'];
  recipeKind: SearchRecipeKind;
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
  useGitignore: boolean;
  recommendationSettings: RecommendationSettings;
  projectNotice: string | undefined;
  searchNotice: string | undefined;
  outputNotice: string | undefined;
  activePreviewFile?: Readonly<{ projectId: string; relativePath: string }>;
}>;

type SetWorkspace = Dispatch<SetStateAction<WorkspaceState>>;

const normalizeFavoriteKey = (value: string): string | undefined => {
  const separator = value.indexOf(':');
  if (separator <= 0 || separator === value.length - 1) return undefined;
  const projectId = value.slice(0, separator);
  const relativePath = value.slice(separator + 1).replace(/\\/g, '/');
  return relativePath ? `${projectId}:${relativePath}` : undefined;
};

const loadFavorites = (): readonly string[] => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(localStorage.getItem('codeprep:favorites') || '[]');
  } catch { return []; }
  if (!Array.isArray(parsed) || !parsed.every((value): value is string => typeof value === 'string')) return [];
  const normalized = parsed.map(normalizeFavoriteKey).filter((key): key is string => key !== undefined);
  try { localStorage.setItem('codeprep:favorites', JSON.stringify(normalized)); } catch { return normalized; }
  return normalized;
};

const initialState: WorkspaceState = {
  projects: [],
  query: '',
  recipeKind: 'text',
  contextLines: 3,
  candidates: [],
  selectedKeys: [],
  format: 'markdown',
  packMode: 'full',
  tokenLimit: 50000,
  preview: '',
  includeDependencies: false,
  includeRelatedDocs: false,
  autoOptimize: false,
  presetKind: 'custom',
  activeTab: 'preview',
  useGitignore: true,
  recommendationSettings: defaultRecommendationSettings(),
  projectNotice: undefined,
  searchNotice: undefined,
  outputNotice: undefined,
  activePreviewFile: undefined,
};

export const useDesktopWorkspace = (api: DesktopApi): DesktopWorkspace => {
  const [state, setState] = useState<WorkspaceState>(initialState);
  const [isProjectsOpen, setIsProjectsOpen] = useState(true);
  const [hasCheckedProjects, setHasCheckedProjects] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortKey, setSortKey] = useState<TreeSort>('name');
  const [favorites, setFavorites] = useState<readonly string[]>(loadFavorites);

  const filteredCandidates = useMemo(() => {
    if (!favoritesOnly) return state.candidates;
    return state.candidates.filter(c => favorites.includes(candidateKey(c.projectId, c.relativePath)));
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

  const toggleProjects = (): void => setIsProjectsOpen(prev => !prev);
  const toggleFavorite = (projectId: string, relativePath: string): void => {
    const key = candidateKey(projectId, relativePath);
    setFavorites(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      localStorage.setItem('codeprep:favorites', JSON.stringify(next));
      return next;
    });
  };

  return workspace(
    api,
    state,
    tree,
    setState,
    isProjectsOpen,
    toggleProjects,
    favorites,
    favoritesOnly,
    setFavoritesOnly,
    toggleFavorite,
    sortKey,
    setSortKey
  );
};

const workspace = (
  api: DesktopApi,
  state: WorkspaceState,
  tree: readonly CandidateTreeNode[],
  set: SetWorkspace,
  isProjectsOpen: boolean,
  toggleProjects: () => void,
  favorites: readonly string[],
  favoritesOnly: boolean,
  setFavoritesOnly: (v: boolean) => void,
  toggleFavorite: (projectId: string, relativePath: string) => void,
  sortKey: TreeSort,
  setSortKey: (value: TreeSort) => void
): DesktopWorkspace => {
  const setQuery = (query: string): void => update(set, { query });
  const setRecipeKind = (recipeKind: SearchRecipeKind): void => update(set, { recipeKind, query: '' });
  const setFormat = (format: ContextOutputFormat): void => update(set, { format });
  const setPackMode = (packMode: PackMode): void => update(set, { packMode });
  const setTokenLimit = (tokenLimit: number): void => update(set, { tokenLimit });
  const setContextLines = (contextLines: number): void => update(set, { contextLines });
  const setIncludeDependencies = (includeDependencies: boolean): void => update(set, { includeDependencies });
  const setIncludeRelatedDocs = (includeRelatedDocs: boolean): void => {
    update(set, { includeRelatedDocs });
    if (includeRelatedDocs) {
      void handleDocGraphRelations(api, set, state.selectedKeys);
    }
  };
  const setAutoOptimize = (autoOptimize: boolean): void => update(set, { autoOptimize });
  const setUseGitignore = (useGitignore: boolean): void => update(set, { useGitignore });
  const setRecommendationSettings = (recommendationSettings: RecommendationSettings): void => update(set, { recommendationSettings });
  const viewFile = (projectId: string, relativePath: string): void => update(set, { activePreviewFile: { projectId, relativePath } });
  const closeFile = (): void => update(set, { activePreviewFile: undefined });

  const setActiveTab = (activeTab: OutputTab): void => update(set, { activeTab });

  const setPresetKind = (preset: ScenarioPresetKind): void => {
    let patchModeUpdates: Partial<WorkspaceState> = { presetKind: preset };
    if (preset === 'initialShare') {
      patchModeUpdates = {
        presetKind: preset,
        packMode: 'skeleton',
        autoOptimize: true,
        includeDependencies: false,
        includeRelatedDocs: false,
        recipeKind: 'text',
        useGitignore: true,
      };
    } else if (preset === 'debugFix') {
      patchModeUpdates = {
        presetKind: preset,
        packMode: 'full',
        autoOptimize: false,
        recipeKind: 'gitDiff',
      };
    } else if (preset === 'newFeature') {
      patchModeUpdates = {
        presetKind: preset,
        packMode: 'full',
        autoOptimize: false,
        includeDependencies: true,
        includeRelatedDocs: true,
      };
    }
    update(set, patchModeUpdates);
  };

  const setFilePackMode = (projectId: string, relativePath: string, mode: PackMode | undefined): void => {
    update(set, {
      candidates: state.candidates.map(c =>
        candidateKey(c.projectId, c.relativePath) === candidateKey(projectId, relativePath) ? { ...c, packMode: mode } : c
      )
    });
  };
  const actions = actionsFor(api, state, set);
  const selectAll = (): void => update(set, { selectedKeys: state.candidates.map(c => candidateKey(c.projectId, c.relativePath)) });
  const clearAll = (): void => update(set, { selectedKeys: [] });

  const treePanel = { tree, candidates: state.candidates, selectedKeys: state.selectedKeys, tokenLimit: state.tokenLimit, sortKey, setSortKey, favorites, favoritesOnly, toggleTreeNode: actions.toggleTreeNode, selectAll, clearAll, viewFile, setFilePackMode, setFavoritesOnly, toggleFavorite };
  const projectPanel = { projects: state.projects, projectNotice: state.projectNotice, ...actions.project };
  const searchPanel = { recipeKind: state.recipeKind, query: state.query, contextLines: state.contextLines, searchNotice: state.searchNotice, presetKind: state.presetKind, useGitignore: state.useGitignore, recommendationSettings: state.recommendationSettings, setRecipeKind, setQuery, setContextLines, setPresetKind, setUseGitignore, setRecommendationSettings, analyze: actions.analyze, clearSearch: actions.clearSearch };
  const outputPanel = { format: state.format, packMode: state.packMode, tokenLimit: state.tokenLimit, preview: state.preview, outputNotice: state.outputNotice, includeDependencies: state.includeDependencies, includeRelatedDocs: state.includeRelatedDocs, autoOptimize: state.autoOptimize, activeTab: state.activeTab, setFormat, setPackMode, setTokenLimit, setIncludeDependencies, setIncludeRelatedDocs, setAutoOptimize, setActiveTab, ...actions.output };
  return { ...state, tree, isProjectsOpen, useGitignore: state.useGitignore, favorites, favoritesOnly, sortKey, setSortKey, toggleProjects, toggleFavorite, setQuery, setRecipeKind, setFormat, setPackMode, setTokenLimit, setContextLines, setIncludeDependencies, setIncludeRelatedDocs, setAutoOptimize, setPresetKind, setActiveTab, setUseGitignore, setRecommendationSettings, setFavoritesOnly, projectPanel, searchPanel, treePanel, outputPanel, ...actions.project, ...actions.output, analyze: actions.analyze, clearSearch: actions.clearSearch, toggleTreeNode: actions.toggleTreeNode, viewFile, closeFile, setFilePackMode };
};

const actionsFor = (api: DesktopApi, state: WorkspaceState, set: SetWorkspace) => ({
  project: { addProject: (path: string) => saveProject(api, set, path, state.useGitignore), chooseProjectFolder: () => chooseFolder(api, set), removeProject: (id: string) => deleteProject(api, set, id, state.useGitignore) },
  analyze: (query = state.query) => analyze(api, set, query, state.recipeKind, state.contextLines, state.projects, state.recommendationSettings),
  clearSearch: () => clearSearch(api, set, state.projects, state.useGitignore),
  toggleTreeNode: (root: CandidateTreeNode, id: string) => {
    const nextKeys = toggleNode(root, id, state.selectedKeys);
    update(set, { selectedKeys: nextKeys });
    const addedKeys = nextKeys.filter(k => !state.selectedKeys.includes(k));
    if (addedKeys.length > 0 && state.includeRelatedDocs) {
      void handleDocGraphRelations(api, set, addedKeys);
    }
  },
  output: { generateOutput: () => generate(api, set, state), copyOutput: () => copy(api, set, state.preview) },
});

const refreshProjects = async (api: DesktopApi, set: SetWorkspace, useGitignore?: boolean): Promise<void> => {
  try {
    const projects = await loadProjects(api);
    const candidates = await fileCandidates(api, projects, useGitignore);
    set(current => ({ ...current, projects, candidates: current.candidates.length ? current.candidates : candidates, projectNotice: undefined }));
  }
  catch (error) { update(set, { projectNotice: desktopErrorMessage(error) }); }
};

const saveProject = async (api: DesktopApi, set: SetWorkspace, value: string, useGitignore?: boolean): Promise<void> => {
  const rootPath = value.trim();
  if (!rootPath) return update(set, { projectNotice: 'Enter a project path.' });
  try {
    const projects = await addProject(api, rootPath);
    update(set, { projects, candidates: await fileCandidates(api, projects, useGitignore), projectNotice: undefined });
  }
  catch (error) { update(set, { projectNotice: desktopErrorMessage(error) }); }
};

const chooseFolder = async (api: DesktopApi, set: SetWorkspace, useGitignore?: boolean): Promise<void> => {
  try { const path = await api.chooseProjectFolder(); if (path) await saveProject(api, set, path, useGitignore); }
  catch (error) { update(set, { projectNotice: desktopErrorMessage(error) }); }
};

const deleteProject = async (api: DesktopApi, set: SetWorkspace, value: string, useGitignore?: boolean): Promise<void> => {
  const projectId = value.trim();
  if (!projectId) return update(set, { projectNotice: 'Select a project to remove.' });
  try {
    const projects = await removeProject(api, projectId);
    update(set, { projects, candidates: await fileCandidates(api, projects, useGitignore), selectedKeys: [], projectNotice: undefined });
  }
  catch (error) { update(set, { projectNotice: desktopErrorMessage(error) }); }
};

const analyze = async (
  api: DesktopApi,
  set: SetWorkspace,
  value: string,
  kind: SearchRecipeKind,
  contextLines: number,
  projects: DesktopWorkspace['projects'],
  recommendationSettings: RecommendationSettings,
): Promise<void> => {
  const result = await analyzeWorkspace(api, value, kind, contextLines, projects, recommendationSettings);
  update(set, result);
};

const generate = async (api: DesktopApi, set: SetWorkspace, state: WorkspaceState): Promise<void> => {
  const candidates = selectedCandidates(state.candidates, state.selectedKeys);
  if (!candidates.length) return update(set, { outputNotice: 'Select at least one file.' });
  try { updateOutput(set, await generateOutput(api, { candidates, format: state.format, maxFileSizeKB: 500, packMode: state.packMode, tokenLimit: state.tokenLimit, includeDependencies: state.includeDependencies, autoOptimize: state.autoOptimize })); }
  catch (error) { update(set, { outputNotice: desktopErrorMessage(error) }); }
};

const copy = async (api: DesktopApi, set: SetWorkspace, preview: string): Promise<void> => {
  const output = preview.trim();
  if (!output) return update(set, { outputNotice: 'Generate output before copying.' });
  try { await copyOutput(api, output); update(set, { outputNotice: undefined }); }
  catch (error) { update(set, { outputNotice: desktopErrorMessage(error) }); }
};

const update = (set: SetWorkspace, value: Partial<WorkspaceState>): void => set(current => ({ ...current, ...value }));

const updateOutput = (set: SetWorkspace, output: DesktopOutput): void =>
  update(set, { preview: output.preview, outputNotice: output.warning });

const clearSearch = async (
  api: DesktopApi,
  set: SetWorkspace,
  projects: DesktopWorkspace['projects'],
  useGitignore?: boolean
): Promise<void> => {
  try {
    const candidates = await fileCandidates(api, projects, useGitignore);
    update(set, { query: '', candidates, searchNotice: undefined });
  } catch (error) {
    update(set, { searchNotice: desktopErrorMessage(error) });
  }
};

const handleDocGraphRelations = async (
  api: DesktopApi,
  set: SetWorkspace,
  addedKeys: readonly string[]
): Promise<void> => {
  for (const key of addedKeys) {
    const [projectId, ...pathParts] = key.split(':');
    const relativePath = pathParts.join(':');
    if (relativePath.toLowerCase().endsWith('.md')) {
      await fetchRelatedDocs(api, set, projectId, relativePath);
    }
  }
};

const fetchRelatedDocs = async (
  api: DesktopApi,
  set: SetWorkspace,
  projectId: string,
  relativePath: string
): Promise<void> => {
  try {
    const result = await api.discoverFiles({
      projectIds: [projectId],
      recipe: { kind: 'docGraph', path: relativePath }
    });
    set(current => {
      const nextCandidates = [...current.candidates];
      const newKeys: string[] = [];
      for (const c of result.candidates) {
        const key = candidateKey(c.projectId, c.relativePath);
        const existingIdx = nextCandidates.findIndex(item => candidateKey(item.projectId, item.relativePath) === key);
        if (existingIdx !== -1) {
          const existingItem = nextCandidates[existingIdx];
          const reasons: readonly CandidateReason[] = existingItem.reasons.includes('docgraph')
            ? existingItem.reasons
            : [...existingItem.reasons, 'docgraph'];
          nextCandidates[existingIdx] = {
            ...existingItem,
            reasons,
            score: c.score
          };
          if (!current.selectedKeys.includes(key)) {
            newKeys.push(key);
          }
        } else {
          nextCandidates.push(c);
          newKeys.push(key);
        }
      }
      return {
        ...current,
        candidates: nextCandidates,
        selectedKeys: [...current.selectedKeys, ...newKeys]
      };
    });
  } catch (error) {
    update(set, { outputNotice: `DocGraph 関連の読み込みに失敗しました: ${desktopErrorMessage(error)}` });
  }
};


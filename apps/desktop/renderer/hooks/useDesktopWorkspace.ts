import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { AnalyzedCandidate, ContextOutputFormat } from '../../../../src/features/desktop-core/application/ports';
import type { DesktopApi, DesktopOutput } from '../../DesktopApi';
import { addProject, copyOutput, desktopErrorMessage, generateOutput, loadProjects, removeProject } from '../DesktopWorkflow';
import { buildCandidateTree, toggleTreeNode as toggleNode } from '../model/candidateTree';
import type { CandidateTreeNode } from '../model/candidateTree';
import type { DesktopWorkspace } from '../types';
import type { SearchRecipeKind } from '../../../../src/features/desktop-core/domain/SearchRecipe';
import type { PackMode } from '../../../../src/features/desktop-core/domain/PackMode';
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
  projectNotice: string | undefined;
  searchNotice: string | undefined;
  outputNotice: string | undefined;
}>;

type SetWorkspace = Dispatch<SetStateAction<WorkspaceState>>;

const initialState: WorkspaceState = {
  projects: [],
  query: '',
  recipeKind: 'text',
  contextLines: 3,
  candidates: [],
  selectedKeys: [],
  format: 'markdown',
  packMode: 'full',
  tokenLimit: 12000,
  preview: '',
  projectNotice: undefined,
  searchNotice: undefined,
  outputNotice: undefined,
};

export const useDesktopWorkspace = (api: DesktopApi): DesktopWorkspace => {
  const [state, setState] = useState<WorkspaceState>(initialState);
  const tree = useMemo(() => buildCandidateTree(state.candidates, state.projects), [state.candidates, state.projects]);
  useEffect(() => { void refreshProjects(api, setState); }, [api]);
  return workspace(api, state, tree, setState);
};

const workspace = (api: DesktopApi, state: WorkspaceState, tree: readonly CandidateTreeNode[], set: SetWorkspace): DesktopWorkspace => {
  const setQuery = (query: string): void => update(set, { query });
  const setRecipeKind = (recipeKind: SearchRecipeKind): void => update(set, { recipeKind, query: '' });
  const setFormat = (format: ContextOutputFormat): void => update(set, { format });
  const setPackMode = (packMode: PackMode): void => update(set, { packMode });
  const setTokenLimit = (tokenLimit: number): void => update(set, { tokenLimit });
  const setContextLines = (contextLines: number): void => update(set, { contextLines });
  const actions = actionsFor(api, state, set);
  const treePanel = { tree, candidates: state.candidates, selectedKeys: state.selectedKeys, toggleTreeNode: actions.toggleTreeNode };
  const projectPanel = { projects: state.projects, projectNotice: state.projectNotice, ...actions.project };
  const searchPanel = { recipeKind: state.recipeKind, query: state.query, contextLines: state.contextLines, searchNotice: state.searchNotice, setRecipeKind, setQuery, setContextLines, analyze: actions.analyze };
  const outputPanel = { format: state.format, packMode: state.packMode, tokenLimit: state.tokenLimit, preview: state.preview, outputNotice: state.outputNotice, setFormat, setPackMode, setTokenLimit, ...actions.output };
  return { ...state, tree, setQuery, setRecipeKind, setFormat, setPackMode, setTokenLimit, setContextLines, projectPanel, searchPanel, treePanel, outputPanel, ...actions.project, ...actions.output, analyze: actions.analyze, toggleTreeNode: actions.toggleTreeNode };
};

const actionsFor = (api: DesktopApi, state: WorkspaceState, set: SetWorkspace) => ({
  project: { addProject: (path: string) => saveProject(api, set, path), chooseProjectFolder: () => chooseFolder(api, set), removeProject: (id: string) => deleteProject(api, set, id) },
  analyze: (query = state.query) => analyze(api, set, query, state.recipeKind, state.contextLines, state.projects),
  toggleTreeNode: (root: CandidateTreeNode, id: string) => update(set, { selectedKeys: toggleNode(root, id, state.selectedKeys) }),
  output: { generateOutput: () => generate(api, set, state), copyOutput: () => copy(api, set, state.preview) },
});

const refreshProjects = async (api: DesktopApi, set: SetWorkspace): Promise<void> => {
  try {
    const projects = await loadProjects(api);
    const candidates = await fileCandidates(api, projects);
    set(current => ({ ...current, projects, candidates: current.candidates.length ? current.candidates : candidates, projectNotice: undefined }));
  }
  catch (error) { update(set, { projectNotice: desktopErrorMessage(error) }); }
};

const saveProject = async (api: DesktopApi, set: SetWorkspace, value: string): Promise<void> => {
  const rootPath = value.trim();
  if (!rootPath) return update(set, { projectNotice: 'Enter a project path.' });
  try {
    const projects = await addProject(api, rootPath);
    update(set, { projects, candidates: await fileCandidates(api, projects), projectNotice: undefined });
  }
  catch (error) { update(set, { projectNotice: desktopErrorMessage(error) }); }
};

const chooseFolder = async (api: DesktopApi, set: SetWorkspace): Promise<void> => {
  try { const path = await api.chooseProjectFolder(); if (path) await saveProject(api, set, path); }
  catch (error) { update(set, { projectNotice: desktopErrorMessage(error) }); }
};

const deleteProject = async (api: DesktopApi, set: SetWorkspace, value: string): Promise<void> => {
  const projectId = value.trim();
  if (!projectId) return update(set, { projectNotice: 'Select a project to remove.' });
  try {
    const projects = await removeProject(api, projectId);
    update(set, { projects, candidates: await fileCandidates(api, projects), selectedKeys: [], projectNotice: undefined });
  }
  catch (error) { update(set, { projectNotice: desktopErrorMessage(error) }); }
};

const analyze = async (
  api: DesktopApi,
  set: SetWorkspace,
  value: string,
  kind: SearchRecipeKind,
  contextLines: number,
  projects: DesktopWorkspace['projects']
): Promise<void> => {
  const result = await analyzeWorkspace(api, value, kind, contextLines, projects);
  update(set, result);
};

const generate = async (api: DesktopApi, set: SetWorkspace, state: WorkspaceState): Promise<void> => {
  const candidates = selectedCandidates(state.candidates, state.selectedKeys);
  if (!candidates.length) return update(set, { outputNotice: 'Select at least one file.' });
  try { updateOutput(set, await generateOutput(api, { candidates, format: state.format, maxFileSizeKB: 500, packMode: state.packMode, tokenLimit: state.tokenLimit })); }
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


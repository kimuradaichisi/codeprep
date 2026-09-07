// apps/desktop/renderer/hooks/workspaceTaskActions.ts
import type { DesktopApi } from '../../DesktopApi';
import { copyOutput, desktopErrorMessage } from '../DesktopWorkflow';
import { analyzeTaskWorkspace, discoverEntryPointsWorkspace } from './workspaceTaskContext';
import type { SetWorkspace, WorkspaceState } from './workspaceState';
import { update } from './workspaceState';

export const analyzeTask = async (api: DesktopApi, set: SetWorkspace, state: WorkspaceState): Promise<void> => {
  if (!state.entryPointInput.trim()) {
    return update(set, { searchNotice: 'At least one entry point is required.', workflowState: 'error' });
  }
  update(set, { isAnalyzing: true, workflowState: 'buildingPack', searchNotice: undefined });
  try {
    const result = await analyzeTaskWorkspace(api, state.taskInput, state.entryPointInput, state.projects, state.tokenLimit, state.adaptiveStrategy);
    const nextState = result.manifest ? 'packReady' : 'error';
    update(set, { ...result, workflowState: nextState, packManifest: result.manifest, packContent: result.packContent, resolvedStrategy: result.resolvedStrategy });
  } finally {
    update(set, { isAnalyzing: false });
  }
};

export const discoverEntryPoints = async (api: DesktopApi, set: SetWorkspace, state: WorkspaceState): Promise<void> => {
  if (!state.taskInput.trim()) {
    return update(set, { searchNotice: 'Task description is required.', workflowState: 'error' });
  }
  update(set, { isDiscoveringEntryPoints: true, workflowState: 'discovering', searchNotice: undefined, entryPointInput: '' });
  try {
    const result = await discoverEntryPointsWorkspace(api, state.taskInput, state.projects);
    const nextState = result.candidates ? 'candidatesReady' : 'error';
    update(set, {
      entryPointCandidates: result.candidates,
      enrichedCandidates: result.enrichedCandidates,
      confidence: result.confidence,
      suggestedPackStrategy: result.suggestedPackStrategy,
      searchNotice: result.searchNotice,
      workflowState: nextState,
    });
  } finally {
    update(set, { isDiscoveringEntryPoints: false });
  }
};

export const toggleEntryPointCandidate = (set: SetWorkspace, path: string): void => {
  set((current) => {
    const currentPaths = current.entryPointInput.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    const index = currentPaths.indexOf(path);
    const nextPaths = index >= 0 ? currentPaths.filter((p) => p !== path) : [...currentPaths, path];
    return { ...current, entryPointInput: nextPaths.join(', ') };
  });
};

export const copyPackContent = async (api: DesktopApi, set: SetWorkspace, state: WorkspaceState): Promise<void> => {
  const content = (state.packContent || state.preview || '').trim();
  if (!content) return update(set, { searchNotice: 'Build a context pack before copying.' });
  try {
    await copyOutput(api, content);
    update(set, { searchNotice: 'Context pack copied to clipboard.' });
  } catch (error) {
    update(set, { searchNotice: desktopErrorMessage(error) });
  }
};

export const resetTaskContext = (set: SetWorkspace): void => {
  update(set, {
    taskInput: '',
    entryPointInput: '',
    entryPointCandidates: undefined,
    enrichedCandidates: undefined,
    confidence: undefined,
    adaptiveStrategy: 'auto',
    packManifest: undefined,
    packContent: undefined,
    resolvedStrategy: undefined,
    workflowState: 'idle',
    searchNotice: undefined,
    preview: '',
  });
};

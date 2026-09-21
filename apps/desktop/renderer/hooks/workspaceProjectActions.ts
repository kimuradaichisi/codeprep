import type { DesktopApi } from '../../DesktopApi';
import type { AnalyzedCandidate } from '../../../../src/features/repository-context/application/ports';
import type { Project } from '../../../../src/features/repository-context/domain/Project';
import type { SearchRecipeKind } from '../../../../src/features/repository-context/domain/SearchRecipe';
import type { RecommendationSettings } from '../../../../src/features/repository-context/domain/Recommendation';
import type { DesktopWorkspace } from '../types';
import { addProject, desktopErrorMessage, loadProjects, removeProject } from '../DesktopWorkflow';
import { fileCandidates, analyzeWorkspace } from './workspaceAnalysis';
import type { SetWorkspace, WorkspaceState } from './workspaceState';
import { update } from './workspaceState';

export const refreshProjects = async (api: DesktopApi, set: SetWorkspace, useGitignore?: boolean): Promise<void> => {
  update(set, { isScanningProject: true, scannedCount: 0 });
  startProgressPolling(api, set);
  try {
    const projects = await loadProjects(api);
    const candidates = await fileCandidates(api, projects, useGitignore);
    set((current) => ({
      ...current,
      projects,
      candidates,
      projectNotice: undefined,
    }));
  } catch (error) {
    update(set, { projectNotice: desktopErrorMessage(error) });
  } finally {
    stopProgressPolling();
    update(set, { isScanningProject: false });
  }
};

let scanProgressTimer: ReturnType<typeof setInterval> | undefined = undefined;

const startProgressPolling = (api: DesktopApi, set: SetWorkspace): void => {
  if (!api.getScanProgress) return;
  stopProgressPolling();
  scanProgressTimer = setInterval(async () => {
    try {
      const progress = await api.getScanProgress?.();
      if (progress) update(set, { scannedCount: progress.count });
    } catch {
      // ignore
    }
  }, 150);
};

const stopProgressPolling = (): void => {
  if (scanProgressTimer) {
    clearInterval(scanProgressTimer);
    scanProgressTimer = undefined;
  }
};

export const cancelScan = async (api: DesktopApi, set: SetWorkspace): Promise<void> => {
  stopProgressPolling();
  try {
    await api.cancelScanProjectFiles?.();
  } finally {
    update(set, { isScanningProject: false, projectNotice: '走査を中止しました (Scanning was cancelled).' });
  }
};

export const saveProject = async (api: DesktopApi, set: SetWorkspace, value: string, useGitignore?: boolean): Promise<void> => {
  const rootPath = value.trim();
  if (!rootPath) return update(set, { projectNotice: 'Enter a project path.' });
  update(set, { isScanningProject: true, scannedCount: 0, projectNotice: undefined });
  startProgressPolling(api, set);
  try {
    const projects = await addProject(api, rootPath);
    const newlyAdded = projects.find(p => p.rootPath === rootPath) ?? projects.at(-1);
    const target = newlyAdded ? [newlyAdded] : projects;
    const newCandidates = await fileCandidates(api, target, useGitignore);
    set((current) => ({
      ...current,
      projects,
      candidates: mergeCandidates(current.candidates, target, newCandidates),
      projectNotice: undefined,
    }));
  } catch (error) {
    update(set, { projectNotice: desktopErrorMessage(error) });
  } finally {
    stopProgressPolling();
    update(set, { isScanningProject: false });
  }
};

function mergeCandidates(
  current: readonly AnalyzedCandidate[],
  targets: readonly Project[],
  incoming: readonly AnalyzedCandidate[]
): readonly AnalyzedCandidate[] {
  const targetIds = new Set(targets.map(t => t.id));
  return [...current.filter(c => !targetIds.has(c.projectId)), ...incoming];
}

export const chooseFolder = async (api: DesktopApi, set: SetWorkspace, useGitignore?: boolean): Promise<void> => {
  try {
    const path = await api.chooseProjectFolder();
    if (path) await saveProject(api, set, path, useGitignore);
  } catch (error) {
    update(set, { projectNotice: desktopErrorMessage(error) });
  }
};

export const deleteProject = async (api: DesktopApi, set: SetWorkspace, value: string, _useGitignore?: boolean): Promise<void> => {
  const projectId = value.trim();
  if (!projectId) return update(set, { projectNotice: 'Select a project to remove.' });
  try {
    const projects = await removeProject(api, projectId);
    set((current) => ({
      ...current,
      projects,
      candidates: current.candidates.filter(c => c.projectId !== projectId),
      selectedKeys: current.selectedKeys.filter(k => !k.startsWith(`${projectId}:`)),
      projectNotice: undefined,
    }));
  } catch (error) {
    update(set, { projectNotice: desktopErrorMessage(error) });
  }
};

export const analyze = async (
  api: DesktopApi,
  set: SetWorkspace,
  value: string,
  kind: SearchRecipeKind,
  contextLines: number,
  projects: DesktopWorkspace['projects'],
  recommendationSettings: RecommendationSettings
): Promise<void> => {
  update(set, { isAnalyzing: true, searchNotice: undefined });
  try {
    const result = await analyzeWorkspace(api, value, kind, contextLines, projects, recommendationSettings);
    update(set, result);
  } finally {
    update(set, { isAnalyzing: false });
  }
};

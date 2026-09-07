// apps/desktop/renderer/hooks/workspaceOutputActions.ts
import type { DesktopApi } from '../../DesktopApi';
import { copyOutput, desktopErrorMessage, saveOutput as saveOutputWorkflow } from '../DesktopWorkflow';
import { selectedCandidates, fileCandidates } from './workspaceAnalysis';
import type { SetWorkspace, WorkspaceState } from './workspaceState';
import { update } from './workspaceState';

export const generate = async (api: DesktopApi, set: SetWorkspace, state: WorkspaceState): Promise<void> => {
  const candidates = selectedCandidates(state.candidates, state.selectedKeys);
  if (!candidates.length) return update(set, { outputNotice: 'Select at least one file.' });
  update(set, { isGenerating: true });
  try {
    const result = await api.generateOutput({
      candidates,
      format: state.format,
      maxFileSizeKB: 500,
      packMode: state.packMode,
      tokenLimit: state.tokenLimit,
      includeDependencies: state.includeDependencies,
      autoOptimize: state.autoOptimize,
    });
    update(set, { preview: result.preview, outputNotice: result.warning });
  } catch (error) {
    update(set, { outputNotice: desktopErrorMessage(error) });
  } finally {
    update(set, { isGenerating: false });
  }
};

export const copy = async (api: DesktopApi, set: SetWorkspace, text: string): Promise<void> => {
  const output = text.trim();
  if (!output) return update(set, { outputNotice: 'Generate output before copying.' });
  try {
    await copyOutput(api, output);
    update(set, { outputNotice: 'Output copied to clipboard.' });
  } catch (error) {
    update(set, { outputNotice: desktopErrorMessage(error) });
  }
};

export const save = async (api: DesktopApi, set: SetWorkspace, state: WorkspaceState): Promise<void> => {
  const content = state.preview.trim();
  if (!content) return update(set, { outputNotice: 'Generate output before saving.' });
  update(set, { isSaving: true });
  try {
    const result = await saveOutputWorkflow(api, { content: state.preview, format: state.format });
    if (result.status === 'saved') update(set, { outputNotice: `Output saved: ${result.filePath}` });
  } catch (error) {
    update(set, { outputNotice: desktopErrorMessage(error) });
  } finally {
    update(set, { isSaving: false });
  }
};

export const clearSearch = async (
  api: DesktopApi,
  set: SetWorkspace,
  projects: WorkspaceState['projects'],
  useGitignore?: boolean,
): Promise<void> => {
  try {
    const candidates = await fileCandidates(api, projects, useGitignore);
    update(set, { query: '', candidates, searchNotice: undefined });
  } catch (error) {
    update(set, { searchNotice: desktopErrorMessage(error) });
  }
};

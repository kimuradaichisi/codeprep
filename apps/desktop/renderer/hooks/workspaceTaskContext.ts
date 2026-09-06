// apps/desktop/renderer/hooks/workspaceTaskContext.ts
import type { DesktopApi, DesktopTaskContextResult } from '../../DesktopApi';
import type { AnalyzedCandidate } from '../../../../src/features/repository-context/application/ports';
import type { Project } from '../../../../src/features/repository-context/domain/Project';
import { desktopErrorMessage } from '../DesktopWorkflow';
import { candidateKeys } from './workspaceAnalysis';

export type TaskAnalysisResultUpdate = Readonly<{
  candidates?: readonly AnalyzedCandidate[];
  selectedKeys?: readonly string[];
  preview?: string;
  searchNotice: string | undefined;
}>;

export const parseEntryPoints = (input: string): readonly string[] => {
  const parts = input.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
  return Object.freeze([...new Set(parts)]);
};

export const analyzeTaskWorkspace = async (
  api: DesktopApi,
  task: string,
  entryPointInput: string,
  projects: readonly Project[],
  tokenLimit: number,
): Promise<TaskAnalysisResultUpdate> => {
  const primaryProject = projects[0];
  if (!primaryProject) return { searchNotice: 'No project selected.' };
  const entryPoints = parseEntryPoints(entryPointInput);
  if (entryPoints.length === 0) return { searchNotice: 'At least one entry point is required.' };
  if (!task.trim()) return { searchNotice: 'Task description is required.' };

  try {
    const result = await api.buildTaskContext({
      projectId: primaryProject.id,
      task: task.trim(),
      entryPoints,
      tokenLimit,
    });
    return toSuccessUpdate(result, projects);
  } catch (error) {
    return { searchNotice: desktopErrorMessage(error) };
  }
};

const toSuccessUpdate = (
  result: DesktopTaskContextResult,
  projects: readonly Project[],
): TaskAnalysisResultUpdate => ({
  candidates: result.candidates,
  selectedKeys: candidateKeys(result.candidates, projects),
  preview: result.markdown,
  searchNotice: result.warnings.join('\n') || undefined,
});

// apps/desktop/renderer/hooks/workspaceTaskContext.ts
import type { DesktopApi, DesktopTaskContextResult } from '../../DesktopApi';
import type { AnalyzedCandidate } from '../../../../src/features/repository-context/application/ports';
import type { Project } from '../../../../src/features/repository-context/domain/Project';
import type { EntryPointCandidate } from '../../../../src/features/repository-context/domain/EntryPointCandidate';
import { desktopErrorMessage } from '../DesktopWorkflow';
import { candidateKeys } from './workspaceAnalysis';

import type { ContextPackV2 } from '../../../../src/features/repository-context/domain/workingset';
import type { DesktopStrategy } from '../types';

export type TaskAnalysisResultUpdate = Readonly<{
  candidates?: readonly AnalyzedCandidate[];
  selectedKeys?: readonly string[];
  preview?: string;
  manifestMarkdown?: string;
  packContent?: string;
  manifest?: import('../../../../src/features/repository-context/domain/ContextManifest').ContextManifest;
  resolvedStrategy?: import('../../../../src/features/repository-context/domain/ContextConfidence').AdaptivePackMode | 'knowledge';
  contextPackV2?: ContextPackV2;
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
  strategy?: DesktopStrategy,
): Promise<TaskAnalysisResultUpdate> => {
  const primaryProject = projects[0];
  if (!primaryProject) return { searchNotice: 'No project selected.' };
  const entryPoints = parseEntryPoints(entryPointInput);
  if (strategy !== 'knowledge' && entryPoints.length === 0) {
    return { searchNotice: 'At least one entry point is required.' };
  }
  if (!task.trim()) return { searchNotice: 'Task description is required.' };

  try {
    const result = await api.buildTaskContext({
      projectId: primaryProject.id,
      task: task.trim(),
      entryPoints: entryPoints.length > 0 ? entryPoints : undefined,
      tokenLimit,
      strategy,
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
  preview: result.content || result.markdown,
  manifestMarkdown: result.markdown,
  packContent: result.content,
  manifest: result.manifest,
  resolvedStrategy: result.resolvedStrategy,
  contextPackV2: result.contextPackV2,
  searchNotice: result.warnings.join('\n') || undefined,
});


export const discoverEntryPointsWorkspace = async (
  api: DesktopApi,
  task: string,
  projects: readonly Project[],
): Promise<Readonly<{
  candidates?: readonly EntryPointCandidate[];
  enrichedCandidates?: readonly import('../../../../src/features/repository-context/domain/CandidateEvidence').EnrichedEntryPointCandidate[];
  confidence?: import('../../../../src/features/repository-context/domain/ContextConfidence').ContextConfidence;
  suggestedPackStrategy?: import('../../../../src/features/repository-context/domain/ContextConfidence').AdaptivePackMode;
  searchNotice?: string;
}>> => {
  const primaryProject = projects[0];
  if (!primaryProject) return { searchNotice: 'No project selected.' };
  if (!task.trim()) return { searchNotice: 'Task description is required.' };

  try {
    const result = await api.discoverEntryPointCandidates({
      projectId: primaryProject.id,
      task: task.trim(),
    });
    return {
      candidates: result.candidates,
      enrichedCandidates: result.enrichedCandidates,
      confidence: result.confidence,
      suggestedPackStrategy: result.suggestedPackStrategy,
      searchNotice: result.warnings.join('\n') || undefined,
    };
  } catch (error) {
    return { searchNotice: desktopErrorMessage(error) };
  }
};

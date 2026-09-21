// apps/desktop/renderer/hooks/workspaceState.ts
import type { Dispatch, SetStateAction } from 'react';
import type { AnalyzedCandidate, ContextOutputFormat } from '../../../../src/features/repository-context/application/ports';
import type { CandidateReason } from '../../../../src/features/repository-context/domain/CandidateFile';
import type { EntryPointCandidate } from '../../../../src/features/repository-context/domain/EntryPointCandidate';
import type { EnrichedEntryPointCandidate } from '../../../../src/features/repository-context/domain/CandidateEvidence';
import type { PackMode } from '../../../../src/features/repository-context/domain/PackMode';
import { defaultRecommendationSettings, type RecommendationSettings } from '../../../../src/features/repository-context/domain/Recommendation';
import type { SearchRecipeKind } from '../../../../src/features/repository-context/domain/SearchRecipe';
import type { DesktopWorkspace, DiscoveryMode, OutputTab, ScenarioPresetKind, ContextWorkflowState } from '../types';
import type { ContextManifest } from '../../../../src/features/repository-context/domain/ContextManifest';

export type WorkspaceState = Readonly<{
  projects: DesktopWorkspace['projects'];
  discoveryMode: DiscoveryMode;
  taskInput: string;
  entryPointInput: string;
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
  isSaving: boolean;
  isAnalyzing: boolean;
  isGenerating: boolean;
  isScanningProject?: boolean;
  scannedCount?: number;
  projectNotice: string | undefined;
  searchNotice: string | undefined;
  outputNotice: string | undefined;
  activePreviewFile?: Readonly<{ projectId: string; relativePath: string }>;
  entryPointCandidates?: readonly EntryPointCandidate[];
  enrichedCandidates?: readonly EnrichedEntryPointCandidate[];
  confidence?: import('../../../../src/features/repository-context/domain/ContextConfidence').ContextConfidence;
  suggestedPackStrategy?: import('../../../../src/features/repository-context/domain/ContextConfidence').AdaptivePackMode;
  adaptiveStrategy?: import('../types').DesktopStrategy;
  isDiscoveringEntryPoints?: boolean;
  workflowState: ContextWorkflowState;
  packManifest?: ContextManifest;
  packContent?: string;
  resolvedStrategy?: import('../../../../src/features/repository-context/domain/ContextConfidence').AdaptivePackMode | 'knowledge';
  manifestMarkdown?: string;
  contextPackV2?: import('../../../../src/features/repository-context/domain/workingset').ContextPackV2;
  activePreviewTab: import('../types').DesktopPreviewTab;
}>;

export type SetWorkspace = Dispatch<SetStateAction<WorkspaceState>>;

export const update = (set: SetWorkspace, patch: Partial<WorkspaceState>): void => {
  set((current) => ({ ...current, ...patch }));
};

export const normalizeFavoriteKey = (value: string): string | undefined => {
  const separator = value.indexOf(':');
  if (separator <= 0 || separator === value.length - 1) return undefined;
  const projectId = value.slice(0, separator);
  const relativePath = value.slice(separator + 1).replace(/\\/g, '/');
  return relativePath ? `${projectId}:${relativePath}` : undefined;
};

export const loadFavorites = (): readonly string[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem('codeprep:favorites') || '[]');
    if (!Array.isArray(parsed) || !parsed.every((v): v is string => typeof v === 'string')) return [];
    const normalized = parsed.map(normalizeFavoriteKey).filter((k): k is string => k !== undefined);
    localStorage.setItem('codeprep:favorites', JSON.stringify(normalized));
    return normalized;
  } catch {
    return [];
  }
};

export const initialWorkspaceState: WorkspaceState = {
  projects: [],
  discoveryMode: 'search',
  taskInput: '',
  entryPointInput: '',
  recipeKind: 'text',
  query: '',
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
  isSaving: false,
  isAnalyzing: false,
  isGenerating: false,
  isScanningProject: false,
  scannedCount: 0,
  projectNotice: undefined,
  searchNotice: undefined,
  outputNotice: undefined,
  adaptiveStrategy: 'auto',
  workflowState: 'idle',
  activePreviewTab: 'manifest',
};

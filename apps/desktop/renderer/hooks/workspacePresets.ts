// apps/desktop/renderer/hooks/workspacePresets.ts
import type { ScenarioPresetKind } from '../types';
import type { WorkspaceState } from './workspaceState';

export const buildPresetPatch = (preset: ScenarioPresetKind): Partial<WorkspaceState> => {
  if (preset === 'initialShare') {
    return {
      presetKind: preset,
      packMode: 'skeleton',
      autoOptimize: true,
      includeDependencies: false,
      includeRelatedDocs: false,
      recipeKind: 'text',
      useGitignore: true,
    };
  }
  if (preset === 'debugFix') {
    return {
      presetKind: preset,
      packMode: 'full',
      autoOptimize: false,
      recipeKind: 'gitDiff',
    };
  }
  if (preset === 'newFeature') {
    return {
      presetKind: preset,
      packMode: 'full',
      autoOptimize: false,
      includeDependencies: true,
      includeRelatedDocs: true,
    };
  }
  return { presetKind: preset };
};

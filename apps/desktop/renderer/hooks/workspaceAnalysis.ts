import type { DesktopApi } from '../../DesktopApi';
import type { AnalyzedCandidate } from '../../../../src/features/desktop-core/application/ports';
import { createSearchRecipe, type SearchRecipeKind } from '../../../../src/features/desktop-core/domain/SearchRecipe';
import { analyzeProjects, desktopErrorMessage } from '../DesktopWorkflow';
import { buildCandidateTree, descendantCandidateKeys } from '../model/candidateTree';
import { candidateKey } from '../model/tokenBudget';
import type { Project } from '../../../../src/features/desktop-core/domain/Project';
import { defaultRecommendationSettings, type RecommendationSettings } from '../../../../src/features/desktop-core/domain/Recommendation';

export const candidateKeys = (
  candidates: readonly AnalyzedCandidate[],
  projects: readonly Project[],
): readonly string[] =>
  buildCandidateTree(candidates, projects).flatMap(descendantCandidateKeys);

export const selectedCandidates = (
  candidates: readonly AnalyzedCandidate[],
  selectedKeys: readonly string[],
): readonly AnalyzedCandidate[] =>
  candidates.filter(c => selectedKeys.includes(candidateKey(c.projectId, c.relativePath)));

export const fileCandidates = async (
  api: DesktopApi,
  projects: readonly Project[],
  useGitignore?: boolean,
): Promise<readonly AnalyzedCandidate[]> => {
  const entries = await Promise.all(projects.map(async project => {
    const files = await api.listProjectFiles(project.id, { useGitignore });
    return files.map(f => ({
      projectId: project.id,
      relativePath: f.relativePath,
      reasons: ['pathAffinity'] as const,
      excluded: false,
      score: 0,
      size: f.size,
    }));
  }));
  return entries.flat();
};

export type AnalysisResultUpdate = Readonly<{
  candidates?: readonly AnalyzedCandidate[];
  selectedKeys?: readonly string[];
  searchNotice: string | undefined;
}>;

export const analyzeWorkspace = async (
  api: DesktopApi,
  value: string,
  kind: SearchRecipeKind,
  contextLines: number,
  projects: readonly Project[],
  recommendationSettings: RecommendationSettings = defaultRecommendationSettings(),
): Promise<AnalysisResultUpdate> => {
  try {
    const recipe = createSearchRecipe(kind, value);
    const result = recipe.kind === 'text'
      ? { candidates: await analyzeProjects(api, recipe.query, contextLines, projects), warnings: [] }
      : await api.discoverFiles({ recipe, projectIds: projects.map(p => p.id), recommendationSettings });
    return {
      candidates: result.candidates,
      selectedKeys: candidateKeys(result.candidates, projects),
      searchNotice: result.warnings.map(warning => warning.message).join('\n') || undefined
    };
  } catch (error) {
    return {
      searchNotice: desktopErrorMessage(error)
    };
  }
};


import type { Project } from '../domain/Project';
import type { CandidateFile } from '../domain/CandidateFile';
import { createCandidateFile } from '../domain/CandidateFile';
import type { RecommendationReason } from '../domain/Recommendation';
import type { AnalysisWarning, FileContentPort, ProjectFilePort, RecommendationSourcePorts } from './ports';
import type { DependencyScanner } from '../../engine/application/DependencyScanner';

export type DiscoveredContextItem = Readonly<{
  candidate: CandidateFile;
  recommendationReasons: readonly RecommendationReason[];
}>;

export const validateAndGetFiles = async (
  project: Project,
  filesPort: ProjectFilePort,
  entryPoints: readonly string[]
): Promise<readonly Readonly<{ relativePath: string; size: number }>[]> => {
  const allFiles = await filesPort.list(project);
  const fileSet = new Set(allFiles.map(f => f.relativePath.replace(/\\/g, '/').toLowerCase()));
  for (const ep of entryPoints) {
    const norm = ep.replace(/\\/g, '/').toLowerCase();
    if (!fileSet.has(norm)) throw new Error(`Entry point not found: ${ep}`);
  }
  return allFiles;
};

export const findRelatedTests = (
  project: Project,
  entryPoints: readonly string[],
  allFiles: readonly Readonly<{ relativePath: string; size: number }>[],
  maxTests = 10
): readonly DiscoveredContextItem[] => {
  const testItems: DiscoveredContextItem[] = [];
  for (const ep of entryPoints) {
    const base = ep.replace(/\\/g, '/').split('/').pop()?.replace(/\.[^.]+$/, '') ?? '';
    if (!base) continue;
    const matches = allFiles.filter(f => isMatchingTest(f.relativePath, base));
    for (const m of matches) {
      testItems.push({
        candidate: createCandidateFile(project.id, m.relativePath, ['pathAffinity']),
        recommendationReasons: [],
      });
    }
  }
  return testItems.slice(0, maxTests);
};

const isMatchingTest = (path: string, base: string): boolean => {
  const norm = path.replace(/\\/g, '/').toLowerCase();
  const fileBase = norm.split('/').pop() ?? '';
  const isTest = norm.includes('__tests__') || fileBase.includes('.test.') || fileBase.includes('.spec.');
  return isTest && fileBase.includes(base.toLowerCase());
};

export const findRepositoryRules = (
  project: Project,
  allFiles: readonly Readonly<{ relativePath: string; size: number }>[]
): readonly DiscoveredContextItem[] => {
  const ruleFiles = ['agents.md', 'claude.md', 'gemini.md', 'rules.md'];
  const matched = allFiles.filter(f => ruleFiles.includes(f.relativePath.split('/').pop()?.toLowerCase() ?? ''));
  return matched.map(m => ({
    candidate: createCandidateFile(project.id, m.relativePath, ['pathAffinity']),
    recommendationReasons: [],
  }));
};

export const findDependencies = async (
  project: Project,
  entryPoints: readonly string[],
  fileContent: FileContentPort,
  scanner?: DependencyScanner,
  maxDeps = 10
): Promise<readonly DiscoveredContextItem[]> => {
  if (!scanner) return [];
  const items: DiscoveredContextItem[] = [];
  for (const ep of entryPoints) {
    try {
      const content = await fileContent.read(project, ep);
      if (typeof content !== 'string') continue;
      const deps = await scanner.findDependencies(ep, content, project.rootPath);
      for (const dep of deps) {
        items.push({
          candidate: createCandidateFile(project.id, dep, ['dependency']),
          recommendationReasons: [],
        });
      }
    } catch {
      // Ignore unreadable entry point content in scanner
    }
  }
  return items.slice(0, maxDeps);
};

export const collectRecommendations = async (
  project: Project,
  entryPoints: readonly string[],
  recommendations?: RecommendationSourcePorts
): Promise<{ items: readonly DiscoveredContextItem[]; warnings: readonly AnalysisWarning[] }> => {
  if (!recommendations) return { items: [], warnings: [] };
  const items: DiscoveredContextItem[] = [];
  const warnings: AnalysisWarning[] = [];
  for (const [source, port] of Object.entries(recommendations)) {
    if (!port) continue;
    for (const ep of entryPoints) {
      try {
        const records = await port.recommend(project, ep);
        for (const r of records) {
          items.push({
            candidate: createCandidateFile(project.id, r.relativePath, ['pathAffinity']),
            recommendationReasons: [r.reason],
          });
        }
      } catch (err) {
        warnings.push({
          kind: 'recommendationFailure',
          projectId: project.id,
          relativePath: ep,
          message: `${source} recommendation failed: ${String(err)}`,
        });
      }
    }
  }
  return { items, warnings };
};

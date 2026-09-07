import type { BuildTaskContextInput, BuildTaskContextPorts, BuildTaskContextResult } from './taskContextPorts';
import type { Project } from '../domain/Project';
import { createContextManifest } from '../domain/ContextManifest';
import { evaluateBudget } from '../domain/ContextBudget';
import { createCandidateFile } from '../domain/CandidateFile';
import {
  validateAndGetFiles,
  findDependencies,
  findRelatedTests,
  collectRecommendations,
  findRepositoryRules,
  type DiscoveredContextItem,
} from './TaskContextExplorer';
import { assembleContextEntries } from './TaskContextAssembler';

import { createAdaptivePackPolicy, type AdaptivePackPolicy } from './AdaptiveContextStrategy';

export class BuildTaskContextUseCase {
  constructor(private readonly ports: BuildTaskContextPorts) {}

  async execute(input: BuildTaskContextInput): Promise<BuildTaskContextResult> {
    const { taskContext } = input;
    const project = await this.getProject(taskContext.projectId);
    const allFiles = await validateAndGetFiles(project, this.ports.files, taskContext.entryPoints);
    const policy = createAdaptivePackPolicy(input.strategy ?? 'standard');
    const { items, warnings } = await this.discoverAll(project, taskContext.entryPoints, allFiles, policy);

    const entries = assembleContextEntries(project.id, items, taskContext.entryPoints);
    const totalBytes = calculateTotalBytes(entries, allFiles);
    const budget = evaluateBudget(totalBytes, input.tokenLimit ?? 40000);
    const manifest = createContextManifest(project.id, taskContext.task, taskContext.entryPoints, entries, budget);
    return { manifest, warnings };
  }

  private async discoverAll(
    project: Project,
    entryPoints: readonly string[],
    allFiles: readonly { relativePath: string; size: number }[],
    policy: AdaptivePackPolicy
  ) {
    const targetItems = toTargetItems(project.id, entryPoints);
    const depItems = await findDependencies(project, entryPoints, this.ports.fileContent, this.ports.dependencyScanner, policy.maxDependencies);
    const testItems = findRelatedTests(project, entryPoints, allFiles, policy.maxRelatedTests);
    const recs = policy.includeRecommendations ? await collectRecommendations(project, entryPoints, this.ports.recommendations) : { items: [], warnings: [] };
    const ruleItems = policy.includeRepositoryRules ? findRepositoryRules(project, allFiles) : [];
    return { items: [...targetItems, ...depItems, ...testItems, ...recs.items, ...ruleItems], warnings: recs.warnings };
  }

  private async getProject(projectId: string) {
    const projects = await this.ports.projects.getByIds([projectId]);
    const project = projects[0];
    if (!project) throw new Error(`Project not found: ${projectId}`);
    return project;
  }
}

const toTargetItems = (projectId: string, entryPoints: readonly string[]): readonly DiscoveredContextItem[] =>
  entryPoints.map(ep => ({
    candidate: createCandidateFile(projectId, ep, ['pathAffinity']),
    recommendationReasons: [],
  }));

const calculateTotalBytes = (
  entries: readonly { relativePath: string }[],
  allFiles: readonly { relativePath: string; size: number }[]
): number => {
  const sizeMap = new Map(allFiles.map(f => [f.relativePath.replace(/\\/g, '/').toLowerCase(), f.size]));
  let sum = 0;
  for (const e of entries) {
    sum += sizeMap.get(e.relativePath.replace(/\\/g, '/').toLowerCase()) ?? 1000;
  }
  return sum;
};

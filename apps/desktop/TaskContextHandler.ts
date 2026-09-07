// apps/desktop/TaskContextHandler.ts
import type { BuildTaskContextPorts, BuildTaskContextResult } from '../../src/features/repository-context/application/taskContextPorts';
import { BuildTaskContextUseCase } from '../../src/features/repository-context/application/BuildTaskContextUseCase';
import { formatContextManifest } from '../../src/features/repository-context/infrastructure/formatting/ContextManifestFormatter';
import { DependencyScanner } from '../../src/features/engine/application/DependencyScanner';
import { MarkdownRecommendationClient } from '../../src/features/repository-context/infrastructure/recommendation/MarkdownRecommendationClient';
import { GitCoChangeClient } from '../../src/features/repository-context/infrastructure/git/GitCoChangeClient';
import { DirectoryProximityClient } from '../../src/features/repository-context/infrastructure/recommendation/DirectoryProximityClient';
import { canReadProjectFile, readProjectFile, getProjectFileSize } from '../../src/features/repository-context/infrastructure/filesystem/ProjectFileContentReader';
import { listProjectFiles } from '../../src/features/repository-context/infrastructure/filesystem/ProjectFileTree';
import type { ProjectRegistryStore } from '../../src/features/repository-context/infrastructure/filesystem/ProjectRegistryStore';
import type { AnalyzedCandidate } from '../../src/features/repository-context/application/ports';
import type { ContextEntry } from '../../src/features/repository-context/domain/ContextEntry';
import type { Project } from '../../src/features/repository-context/domain/Project';
import type { AdaptivePackMode } from '../../src/features/repository-context/domain/ContextConfidence';
import type { BuildTaskContextRequest, DesktopTaskContextResult } from './DesktopApi';
import { toBuildTaskContextRequest } from './TaskContextRequestParser';
import { resolveTaskContextStrategy } from './TaskContextStrategyResolver';
import { loadPackContent } from './TaskContextPackLoader';

export const handleBuildTaskContext = async (
  registry: ProjectRegistryStore,
  value: unknown,
): Promise<DesktopTaskContextResult> => {
  const request = toBuildTaskContextRequest(value);
  const project = await findProject(registry, request.projectId);
  const resolvedStrategy = await resolveTaskContextStrategy(registry, project, request.task, request.strategy);
  const result = await executeUseCase(project, registry, request, resolvedStrategy);
  const content = await loadPackContent(project, result.manifest.entries, request.task, resolvedStrategy);
  return formatResult(result, content, resolvedStrategy);
};

const findProject = async (registry: ProjectRegistryStore, projectId: string): Promise<Project> => {
  const projects = await registry.getByIds([projectId]);
  const project = projects[0];
  if (!project) throw new Error(`Project was not found: ${projectId}`);
  return project;
};

const executeUseCase = async (
  project: Project,
  registry: ProjectRegistryStore,
  request: BuildTaskContextRequest,
  strategy: AdaptivePackMode,
): Promise<BuildTaskContextResult> => {
  const ports = createTaskContextPorts(registry);
  const useCase = new BuildTaskContextUseCase(ports);
  return useCase.execute({
    taskContext: { projectId: project.id, task: request.task, entryPoints: request.entryPoints },
    tokenLimit: request.tokenLimit,
    strategy,
  });
};

const formatResult = (
  result: BuildTaskContextResult,
  content: string,
  resolvedStrategy: AdaptivePackMode,
): DesktopTaskContextResult => ({
  manifest: result.manifest,
  markdown: formatContextManifest(result.manifest),
  content,
  resolvedStrategy,
  candidates: Object.freeze(result.manifest.entries.map(toAnalyzedCandidate)),
  warnings: Object.freeze(result.warnings.map(w => w.message)),
});

const toAnalyzedCandidate = (entry: ContextEntry): AnalyzedCandidate => ({
  projectId: entry.projectId,
  relativePath: entry.relativePath,
  reasons: entry.candidateReasons.length > 0 ? entry.candidateReasons : ['pathAffinity'],
  recommendationReasons: entry.recommendationReasons,
  score: entry.score,
  excluded: false,
  packMode: entry.packMode,
  excerpts: entry.excerpts,
});

const createFilePort = () => ({
  list: async (p: Project) => {
    const paths = await listProjectFiles(p.rootPath);
    return Promise.all(paths.map(async rel => ({ relativePath: rel, size: await getProjectFileSize(p, rel) })));
  },
});

const createTaskContextPorts = (registry: ProjectRegistryStore): BuildTaskContextPorts => {
  const filePort = createFilePort();
  const contentPort = { read: readProjectFile, canRead: canReadProjectFile };
  return {
    projects: registry,
    files: filePort,
    fileContent: contentPort,
    dependencyScanner: new DependencyScanner(),
    recommendations: {
      markdownLink: new MarkdownRecommendationClient(contentPort, filePort, 'markdownLink'),
      nameHeading: new MarkdownRecommendationClient(contentPort, filePort, 'nameHeading'),
      gitCoChange: new GitCoChangeClient(),
      directoryProximity: new DirectoryProximityClient(filePort),
    },
  };
};

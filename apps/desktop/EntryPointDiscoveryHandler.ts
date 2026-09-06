// apps/desktop/EntryPointDiscoveryHandler.ts
import { DiscoverEntryPointCandidatesUseCase } from '../../src/features/repository-context/application/DiscoverEntryPointCandidatesUseCase';
import type { DiscoverEntryPointCandidatesPorts } from '../../src/features/repository-context/application/entryPointCandidatePorts';
import { canReadProjectFile, readProjectFile, getProjectFileSize } from '../../src/features/repository-context/infrastructure/filesystem/ProjectFileContentReader';
import { listProjectFiles } from '../../src/features/repository-context/infrastructure/filesystem/ProjectFileTree';
import type { ProjectRegistryStore } from '../../src/features/repository-context/infrastructure/filesystem/ProjectRegistryStore';
import { RipgrepClient } from '../../src/features/repository-context/infrastructure/search/RipgrepClient';
import type { Project } from '../../src/features/repository-context/domain/Project';
import type { DiscoverEntryPointCandidatesResponse } from './DesktopApi';
import { toDiscoverEntryPointCandidatesRequest } from './TaskContextRequestParser';

export const handleDiscoverEntryPointCandidates = async (
  registry: ProjectRegistryStore,
  value: unknown
): Promise<DiscoverEntryPointCandidatesResponse> => {
  const request = toDiscoverEntryPointCandidatesRequest(value);
  const projects = await registry.getByIds([request.projectId]);
  if (!projects[0]) throw new Error(`Project was not found: ${request.projectId}`);

  const ports = createDiscoveryPorts(registry);
  const useCase = new DiscoverEntryPointCandidatesUseCase(ports);
  const result = await useCase.execute({
    task: request.task,
    projectIds: [request.projectId],
    maxCandidates: request.maxCandidates,
    manualPinnedPaths: request.manualPinnedPaths,
  });

  return Object.freeze({
    candidates: result.candidates,
    terms: result.terms,
    warnings: Object.freeze(result.warnings.map((w) => w.message)),
  });
};

const createFilePort = () => ({
  list: async (p: Project) => {
    const paths = await listProjectFiles(p.rootPath);
    return Promise.all(paths.map(async (rel) => ({ relativePath: rel, size: await getProjectFileSize(p, rel) })));
  },
});

const createDiscoveryPorts = (registry: ProjectRegistryStore): DiscoverEntryPointCandidatesPorts => ({
  projects: registry,
  files: createFilePort(),
  ripgrep: new RipgrepClient(),
  fileContent: { read: readProjectFile, canRead: canReadProjectFile },
});

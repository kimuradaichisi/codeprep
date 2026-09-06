// apps/desktop/EntryPointDiscoveryHandler.ts
import { DiscoverEntryPointCandidatesUseCase } from '../../src/features/repository-context/application/DiscoverEntryPointCandidatesUseCase';
import type { DiscoverEntryPointCandidatesPorts } from '../../src/features/repository-context/application/entryPointCandidatePorts';
import { canReadProjectFile, readProjectFile, getProjectFileSize } from '../../src/features/repository-context/infrastructure/filesystem/ProjectFileContentReader';
import { listProjectFiles } from '../../src/features/repository-context/infrastructure/filesystem/ProjectFileTree';
import type { ProjectRegistryStore } from '../../src/features/repository-context/infrastructure/filesystem/ProjectRegistryStore';
import { RipgrepClient } from '../../src/features/repository-context/infrastructure/search/RipgrepClient';
import type { EntryPointCandidate } from '../../src/features/repository-context/domain/EntryPointCandidate';
import type { EnrichedEntryPointCandidate } from '../../src/features/repository-context/domain/CandidateEvidence';
import { EnrichEntryPointCandidatesUseCase } from '../../src/features/repository-context/application/EnrichEntryPointCandidatesUseCase';
import type { CandidateEvidencePorts } from '../../src/features/repository-context/application/candidateEvidencePorts';
import { DependencyScanner } from '../../src/features/engine/application/DependencyScanner';
import { GitCoChangeClient } from '../../src/features/repository-context/infrastructure/git/GitCoChangeClient';
import { DirectoryProximityClient } from '../../src/features/repository-context/infrastructure/recommendation/DirectoryProximityClient';
import { MarkdownRecommendationClient } from '../../src/features/repository-context/infrastructure/recommendation/MarkdownRecommendationClient';
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

  const enriched = await tryEnrichCandidates(registry, result.candidates, request.task, request.projectId);

  return Object.freeze({
    candidates: result.candidates,
    enrichedCandidates: enriched,
    terms: result.terms,
    warnings: Object.freeze(result.warnings.map((w) => w.message)),
  });
};

const tryEnrichCandidates = async (
  registry: ProjectRegistryStore,
  candidates: readonly EntryPointCandidate[],
  task: string,
  projectId: string
): Promise<readonly EnrichedEntryPointCandidate[] | undefined> => {
  try {
    const filePort = createFilePort();
    const fileContent = { read: readProjectFile, canRead: canReadProjectFile };
    const ports: CandidateEvidencePorts = {
      projects: registry,
      files: filePort,
      fileContent,
      dependencyScanner: new DependencyScanner(),
      recommendations: {
        gitCoChange: new GitCoChangeClient(),
        directoryProximity: new DirectoryProximityClient(filePort),
        markdownLink: new MarkdownRecommendationClient(fileContent, filePort, 'markdownLink'),
      },
    };
    return await new EnrichEntryPointCandidatesUseCase(ports).execute({
      task,
      projectIds: [projectId],
      candidates,
    });
  } catch {
    return undefined;
  }
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

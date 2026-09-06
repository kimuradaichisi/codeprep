// apps/desktop/DesktopAnalysisHandlers.ts
import { clipboard } from 'electron';
import { AnalyzeProjectsUseCase } from '../../src/features/repository-context/application/AnalyzeProjectsUseCase';
import { DiscoverFilesUseCase } from '../../src/features/repository-context/application/DiscoverFilesUseCase';
import { BuildDesktopContextUseCase } from '../../src/features/repository-context/application/BuildDesktopContextUseCase';
import type { Project } from '../../src/features/repository-context/domain/Project';
import { GitMetadataClient } from '../../src/features/repository-context/infrastructure/git/GitMetadataClient';
import { GitHistoryReader } from '../../src/features/repository-context/infrastructure/git/GitHistoryReader';
import type { ProjectRegistryStore } from '../../src/features/repository-context/infrastructure/filesystem/ProjectRegistryStore';
import { RipgrepClient } from '../../src/features/repository-context/infrastructure/search/RipgrepClient';
import { DesktopContextFormatter } from '../../src/features/repository-context/infrastructure/formatting/DesktopContextFormatter';
import { canReadProjectFile, readProjectFile, getProjectFileSize } from '../../src/features/repository-context/infrastructure/filesystem/ProjectFileContentReader';
import { listProjectFiles } from '../../src/features/repository-context/infrastructure/filesystem/ProjectFileTree';
import { DependencyScanner } from '../../src/features/engine/application/DependencyScanner';
import { DocGraphClient } from '../../src/features/repository-context/infrastructure/recommendation/DocGraphClient';
import { MarkdownRecommendationClient } from '../../src/features/repository-context/infrastructure/recommendation/MarkdownRecommendationClient';
import { GitCoChangeClient } from '../../src/features/repository-context/infrastructure/git/GitCoChangeClient';
import { DirectoryProximityClient } from '../../src/features/repository-context/infrastructure/recommendation/DirectoryProximityClient';
import { toAnalyzeInput, toDiscoverInput, toBuildInput } from './DesktopRequestParser';

export const handleAnalyzeProjects = async (registry: ProjectRegistryStore, value: unknown) =>
  new AnalyzeProjectsUseCase({
    projects: registry,
    ripgrep: new RipgrepClient(),
    gitMetadata: new GitMetadataClient(),
    fileContent: { canRead: canReadProjectFile, read: readProjectFile },
    fileSize: { getSize: getProjectFileSize },
  }).analyze(toAnalyzeInput(value));

export const handleDiscoverFiles = async (registry: ProjectRegistryStore, value: unknown) => {
  const filePort = {
    list: async (project: Project) => {
      const relativePaths = await listProjectFiles(project.rootPath);
      return Promise.all(
        relativePaths.map(async (rel) => ({ relativePath: rel, size: await getProjectFileSize(project, rel) }))
      );
    },
  };
  return new DiscoverFilesUseCase({
    projects: registry,
    ripgrep: new RipgrepClient(),
    gitMetadata: new GitMetadataClient(),
    files: filePort,
    clipboard: { readText: () => Promise.resolve(clipboard.readText()) },
    gitHistory: new GitHistoryReader(),
    fileSize: { getSize: getProjectFileSize },
    fileContent: { read: readProjectFile, canRead: canReadProjectFile },
    dependencyScanner: new DependencyScanner(),
    docGraph: new DocGraphClient(),
    recommendations: {
      markdownLink: new MarkdownRecommendationClient(
        { read: readProjectFile, canRead: canReadProjectFile },
        filePort,
        'markdownLink'
      ),
      nameHeading: new MarkdownRecommendationClient(
        { read: readProjectFile, canRead: canReadProjectFile },
        filePort,
        'nameHeading'
      ),
      gitCoChange: new GitCoChangeClient(),
      directoryProximity: new DirectoryProximityClient(filePort),
    },
  }).discover(toDiscoverInput(value));
};

export const handleGenerateOutput = async (registry: ProjectRegistryStore, value: unknown) => {
  const result = await new BuildDesktopContextUseCase({
    projects: registry,
    fileContent: { canRead: canReadProjectFile, read: readProjectFile },
    formatter: new DesktopContextFormatter(),
  }).build(toBuildInput(value));
  return {
    preview: result.preview,
    warning: result.warnings.map((w) => w.message).join('\n') || undefined,
    manifest: result.manifest,
  };
};

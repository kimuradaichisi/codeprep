/*
 * Copyright 2026 CodePrep Contributors
 */
import { join } from 'path';
import type { Project } from '../../domain/Project';
import { DiscoverEntryPointCandidatesUseCase } from '../../application/DiscoverEntryPointCandidatesUseCase';
import { EnrichEntryPointCandidatesUseCase } from '../../application/EnrichEntryPointCandidatesUseCase';
import { BuildTaskContextUseCase } from '../../application/BuildTaskContextUseCase';
import { PrepareTaskContextUseCase } from '../../application/PrepareTaskContextUseCase';
import { SemanticEntryPointCandidateSource } from '../../application/SemanticEntryPointCandidateSource';
import { SemanticSearchUseCase } from '../../application/SemanticSearchUseCase';
import { HttpEmbeddingAdapter } from '../embedding/HttpEmbeddingAdapter';
import { DependencyScanner } from '../../../engine/application/DependencyScanner';
import { DesktopContextFormatter } from '../formatting/DesktopContextFormatter';
import { listProjectFiles } from '../filesystem/ProjectFileTree';
import { JsonStructuredKnowledgeIndexStore } from '../filesystem/JsonStructuredKnowledgeIndexStore';
import { JsonSemanticIndexStore } from '../filesystem/JsonSemanticIndexStore';
import { GitCoChangeClient } from '../git/GitCoChangeClient';
import { RipgrepClient } from '../search/RipgrepClient';
import { canReadProjectFile, readProjectFile } from '../filesystem/ProjectFileContentReader';
import type { ProjectRegistryPort, ProjectFilePort, FileContentPort } from '../../application/ports';
import { sanitizeWorkspacePath } from '../security/workspacePathSanitizer';

export interface RepositoryContextContainer {
  readonly project: Project;
  readonly discoverUseCase: DiscoverEntryPointCandidatesUseCase;
  readonly enrichUseCase: EnrichEntryPointCandidatesUseCase;
  readonly buildContextUseCase: BuildTaskContextUseCase;
  readonly prepareContextUseCase: PrepareTaskContextUseCase;
  readonly formatter: DesktopContextFormatter;
  readonly fileContentPort: FileContentPort;
  readonly structuredKnowledgeStore: JsonStructuredKnowledgeIndexStore;
  readonly semanticStore: JsonSemanticIndexStore;
  readonly embeddingAdapter: HttpEmbeddingAdapter;
  readonly filesPort: ProjectFilePort;
}

function createFsPorts(): { files: ProjectFilePort; content: FileContentPort } {
  return {
    files: { list: async (p) => (await listProjectFiles(p.rootPath, true)).map((rel) => ({ relativePath: rel, size: 100 })) },
    content: { canRead: async (p, rel) => canReadProjectFile(p, rel), read: async (p, rel) => readProjectFile(p, rel) },
  };
}

function createUseCases(p: Project, reg: ProjectRegistryPort, f: ProjectFilePort, c: FileContentPort, dir: string) {
  const kStore = new JsonStructuredKnowledgeIndexStore(dir);
  const sStore = new JsonSemanticIndexStore(dir);
  const embedAdapter = new HttpEmbeddingAdapter();
  const searchUseCase = new SemanticSearchUseCase(embedAdapter, sStore);
  const semanticSource = new SemanticEntryPointCandidateSource(searchUseCase, p.id);
  const scanner = new DependencyScanner();
  const discoverUseCase = new DiscoverEntryPointCandidatesUseCase({ projects: reg, files: f, fileContent: c, ripgrep: new RipgrepClient(), customSources: [semanticSource] });
  const enrichUseCase = new EnrichEntryPointCandidatesUseCase({ projects: reg, files: f, fileContent: c, dependencyScanner: scanner, recommendations: { gitCoChange: new GitCoChangeClient() }, knowledgeIndexStore: kStore });
  const buildContextUseCase = new BuildTaskContextUseCase({ projects: reg, files: f, fileContent: c, dependencyScanner: scanner });
  return { kStore, sStore, embedAdapter, discoverUseCase, enrichUseCase, buildContextUseCase };
}

export function createRepositoryContextContainer(workspaceRootRaw: string, projectId = 'workspace'): RepositoryContextContainer {
  const root = sanitizeWorkspacePath(workspaceRootRaw);
  const project: Project = { id: projectId, name: 'Bound Workspace', rootPath: root, excludePatterns: ['.git', 'node_modules', 'dist', 'out'] };
  const registry: ProjectRegistryPort = { getByIds: async (ids) => ids.includes(project.id) ? [project] : [] };
  const { files, content } = createFsPorts();
  const uc = createUseCases(project, registry, files, content, join(root, '.codeprep'));
  const formatter = new DesktopContextFormatter();
  const prepareContextUseCase = new PrepareTaskContextUseCase({
    project,
    discoverUseCase: uc.discoverUseCase,
    enrichUseCase: uc.enrichUseCase,
    buildContextUseCase: uc.buildContextUseCase,
    fileContentPort: content,
    formatter,
  });
  return {
    project, discoverUseCase: uc.discoverUseCase, enrichUseCase: uc.enrichUseCase,
    buildContextUseCase: uc.buildContextUseCase, prepareContextUseCase, formatter,
    fileContentPort: content, structuredKnowledgeStore: uc.kStore, semanticStore: uc.sStore,
    embeddingAdapter: uc.embedAdapter, filesPort: files,
  };
}

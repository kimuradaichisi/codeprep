// apps/mcp/composition.ts
import { join } from 'path';
import type { Project } from '../../src/features/repository-context/domain/Project';
import { DiscoverEntryPointCandidatesUseCase } from '../../src/features/repository-context/application/DiscoverEntryPointCandidatesUseCase';
import { EnrichEntryPointCandidatesUseCase } from '../../src/features/repository-context/application/EnrichEntryPointCandidatesUseCase';
import { BuildTaskContextUseCase } from '../../src/features/repository-context/application/BuildTaskContextUseCase';
import { PrepareTaskContextUseCase } from '../../src/features/repository-context/application/PrepareTaskContextUseCase';
import { SemanticEntryPointCandidateSource } from '../../src/features/repository-context/application/SemanticEntryPointCandidateSource';
import { SemanticSearchUseCase } from '../../src/features/repository-context/application/SemanticSearchUseCase';
import { HttpEmbeddingAdapter } from '../../src/features/repository-context/infrastructure/embedding/HttpEmbeddingAdapter';
import { DependencyScanner } from '../../src/features/engine/application/DependencyScanner';
import { DesktopContextFormatter } from '../../src/features/repository-context/infrastructure/formatting/DesktopContextFormatter';
import { listProjectFiles } from '../../src/features/repository-context/infrastructure/filesystem/ProjectFileTree';
import { JsonStructuredKnowledgeIndexStore } from '../../src/features/repository-context/infrastructure/filesystem/JsonStructuredKnowledgeIndexStore';
import { JsonSemanticIndexStore } from '../../src/features/repository-context/infrastructure/filesystem/JsonSemanticIndexStore';
import { GitCoChangeClient } from '../../src/features/repository-context/infrastructure/git/GitCoChangeClient';
import { RipgrepClient } from '../../src/features/repository-context/infrastructure/search/RipgrepClient';
import { canReadProjectFile, readProjectFile } from '../../src/features/repository-context/infrastructure/filesystem/ProjectFileContentReader';
import type { ProjectRegistryPort, ProjectFilePort, FileContentPort } from '../../src/features/repository-context/application/ports';
import type { McpWorkspaceStatusResult } from './types';
import { checkMcpStatus } from './statusChecker';
import { sanitizeWorkspacePath } from './security';

export interface McpContextContainer {
  readonly project: Project;
  readonly discoverUseCase: DiscoverEntryPointCandidatesUseCase;
  readonly enrichUseCase: EnrichEntryPointCandidatesUseCase;
  readonly buildContextUseCase: BuildTaskContextUseCase;
  readonly prepareContextUseCase: PrepareTaskContextUseCase;
  readonly formatter: DesktopContextFormatter;
  readonly fileContentPort: FileContentPort;
  checkStatus(): Promise<McpWorkspaceStatusResult>;
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

function createPrepareUseCase(p: Project, u: ReturnType<typeof createUseCases>, c: FileContentPort, fmt: DesktopContextFormatter) {
  return new PrepareTaskContextUseCase({
    project: p,
    discoverUseCase: u.discoverUseCase,
    enrichUseCase: u.enrichUseCase,
    buildContextUseCase: u.buildContextUseCase,
    fileContentPort: c,
    formatter: fmt,
  });
}

export function createMcpContainer(workspaceRootRaw: string): McpContextContainer {
  const root = sanitizeWorkspacePath(workspaceRootRaw);
  const project: Project = { id: 'mcp-workspace', name: 'MCP Bound Workspace', rootPath: root, excludePatterns: ['.git', 'node_modules', 'dist', 'out'] };
  const registry: ProjectRegistryPort = { getByIds: async (ids) => ids.includes(project.id) ? [project] : [] };
  const { files, content } = createFsPorts();
  const uc = createUseCases(project, registry, files, content, join(root, '.codeprep'));
  const formatter = new DesktopContextFormatter();
  const prepareContextUseCase = createPrepareUseCase(project, uc, content, formatter);
  const checkStatus = () => checkMcpStatus({ project, files, knowledgeStore: uc.kStore, semanticStore: uc.sStore, embeddingPort: uc.embedAdapter });
  return { project, discoverUseCase: uc.discoverUseCase, enrichUseCase: uc.enrichUseCase, buildContextUseCase: uc.buildContextUseCase, prepareContextUseCase, formatter, fileContentPort: content, checkStatus };
}



import type { Project } from '../../src/features/repository-context/domain/Project';
import type { RepositoryIndex } from '../../src/features/repository-context/domain/RepositoryIndex';
import type { RepositoryIndexChangeSet } from '../../src/features/repository-context/domain/RepositoryIndexChangeSet';
import type { StructuredKnowledgeIndex } from '../../src/features/repository-context/domain/StructuredKnowledgeIndex';
import { BuildStructuredKnowledgeIndexUseCase } from '../../src/features/repository-context/application/BuildStructuredKnowledgeIndexUseCase';
import { KnowledgeExtractionService } from '../../src/features/repository-context/application/KnowledgeExtractionService';
import { RefreshStructuredKnowledgeIndexUseCase } from '../../src/features/repository-context/application/RefreshStructuredKnowledgeIndexUseCase';
import { TypeScriptSymbolExtractor } from '../../src/features/repository-context/infrastructure/code/TypeScriptSymbolExtractor';
import { JsonStructuredKnowledgeIndexStore } from '../../src/features/repository-context/infrastructure/filesystem/JsonStructuredKnowledgeIndexStore';
import { NodeFsKnowledgeFileReader } from '../../src/features/repository-context/infrastructure/filesystem/NodeFsKnowledgeFileReader';
import { MarkdownSectionExtractor } from '../../src/features/repository-context/infrastructure/markdown/MarkdownSectionExtractor';
import type { StructuredKnowledgeIndexStatus } from './DesktopApi';

export interface KnowledgeStatusResult {
  readonly status: StructuredKnowledgeIndexStatus;
  readonly entries: number;
  readonly index?: StructuredKnowledgeIndex;
}

export const getStructuredKnowledgeStatus = async (
  indexesDir: string,
  workspaceId: string
): Promise<KnowledgeStatusResult> => {
  try {
    const store = new JsonStructuredKnowledgeIndexStore(indexesDir);
    const index = await store.load(workspaceId);
    if (!index) return { status: 'not_built', entries: 0 };
    return { status: 'ready', entries: index.entries.length, index };
  } catch {
    return { status: 'degraded', entries: 0 };
  }
};

function createServices(indexesDir: string, projects: readonly Project[]) {
  const store = new JsonStructuredKnowledgeIndexStore(indexesDir);
  const fileReader = new NodeFsKnowledgeFileReader((projId) => {
    const p = projects.find((item) => item.id === projId);
    return p?.rootPath ?? '';
  });
  const mdExtractor = new MarkdownSectionExtractor();
  const tsExtractor = new TypeScriptSymbolExtractor();
  const extractorService = new KnowledgeExtractionService(mdExtractor, tsExtractor, fileReader);
  const buildUseCase = new BuildStructuredKnowledgeIndexUseCase(extractorService, store);
  const refreshUseCase = new RefreshStructuredKnowledgeIndexUseCase(extractorService, store, buildUseCase);
  return { buildUseCase, refreshUseCase };
}

export const syncStructuredKnowledgeIndex = async (params: {
  indexesDir: string;
  workspaceId: string;
  projects: readonly Project[];
  repoIndex: RepositoryIndex;
  changeSet: RepositoryIndexChangeSet;
  rebuilt: boolean;
}): Promise<KnowledgeStatusResult> => {
  try {
    const { buildUseCase, refreshUseCase } = createServices(params.indexesDir, params.projects);
    const result = params.rebuilt
      ? await buildUseCase.execute(params.repoIndex)
      : await refreshUseCase.execute(params.workspaceId, params.changeSet, params.repoIndex);
    return { status: 'ready', entries: result.entries.length, index: result };
  } catch {
    return { status: 'degraded', entries: 0 };
  }
};

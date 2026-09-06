import type { RepositoryIndexChangeSet } from '../../src/features/repository-context/domain/RepositoryIndexChangeSet';
import type { StructuredKnowledgeIndex } from '../../src/features/repository-context/domain/StructuredKnowledgeIndex';
import { BuildSemanticIndexUseCase } from '../../src/features/repository-context/application/BuildSemanticIndexUseCase';
import { RefreshSemanticIndexUseCase } from '../../src/features/repository-context/application/RefreshSemanticIndexUseCase';
import type { EmbeddingPort } from '../../src/features/repository-context/application/semanticIndexPorts';
import {
  HttpEmbeddingAdapter,
  type HttpEmbeddingConfig,
} from '../../src/features/repository-context/infrastructure/embedding/HttpEmbeddingAdapter';
import { JsonSemanticIndexStore } from '../../src/features/repository-context/infrastructure/filesystem/JsonSemanticIndexStore';
import type { SemanticIndexStatus } from './DesktopApi';

export interface SemanticStatusResult {
  readonly status: SemanticIndexStatus;
  readonly entries: number;
}

export const getSemanticIndexStatus = async (
  indexesDir: string,
  workspaceId: string
): Promise<SemanticStatusResult> => {
  try {
    const store = new JsonSemanticIndexStore(indexesDir);
    const index = await store.load(workspaceId);
    if (!index) return { status: 'not_built', entries: 0 };
    return { status: 'ready', entries: index.entries.length };
  } catch {
    return { status: 'degraded', entries: 0 };
  }
};

export const syncSemanticIndex = async (params: {
  indexesDir: string;
  workspaceId: string;
  currentKnowledge: StructuredKnowledgeIndex;
  changeSet: RepositoryIndexChangeSet;
  rebuilt: boolean;
  embeddingPort?: EmbeddingPort;
  embeddingConfig?: HttpEmbeddingConfig;
}): Promise<SemanticStatusResult> => {
  try {
    const port = params.embeddingPort ?? new HttpEmbeddingAdapter(params.embeddingConfig);
    const store = new JsonSemanticIndexStore(params.indexesDir);
    const buildUseCase = new BuildSemanticIndexUseCase(port, store);
    const refreshUseCase = new RefreshSemanticIndexUseCase(port, store, buildUseCase);

    const result = params.rebuilt
      ? await buildUseCase.execute(params.currentKnowledge)
      : await refreshUseCase.execute(params.workspaceId, params.currentKnowledge, params.changeSet);

    return { status: 'ready', entries: result.entries.length };
  } catch {
    return { status: 'degraded', entries: 0 };
  }
};

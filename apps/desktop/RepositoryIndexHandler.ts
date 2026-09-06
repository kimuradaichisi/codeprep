import type { ProjectRegistryStore } from '../../src/features/repository-context/infrastructure/filesystem/ProjectRegistryStore';
import { JsonRepositoryIndexStore } from '../../src/features/repository-context/infrastructure/filesystem/JsonRepositoryIndexStore';
import { ProjectScannerClient } from '../../src/features/repository-context/infrastructure/filesystem/ProjectScannerClient';
import { NodeCryptoFingerprintClient } from '../../src/features/repository-context/infrastructure/filesystem/NodeCryptoFingerprintClient';
import { RefreshRepositoryIndexUseCase } from '../../src/features/repository-context/application/RefreshRepositoryIndexUseCase';
import type {
  RepositoryIndexStatusResponse,
  RefreshRepositoryIndexResponse,
} from './DesktopApi';
import {
  getStructuredKnowledgeStatus,
  syncStructuredKnowledgeIndex,
} from './StructuredKnowledgeHandler';

export const handleGetRepositoryIndexStatus = async (
  indexesDir: string,
  workspaceIdVal: unknown
): Promise<RepositoryIndexStatusResponse> => {
  const workspaceId = typeof workspaceIdVal === 'string' ? workspaceIdVal : 'default';
  const store = new JsonRepositoryIndexStore(indexesDir);
  const index = await store.load(workspaceId);
  if (!index) return { status: 'not_indexed', totalFiles: 0 };
  const knowledge = await getStructuredKnowledgeStatus(indexesDir, workspaceId);
  return {
    status: 'ready',
    totalFiles: index.entries.length,
    updatedAt: index.metadata.updatedAt,
    schemaVersion: index.metadata.schemaVersion,
    knowledgeStatus: knowledge.status,
    knowledgeEntries: knowledge.entries,
  };
};

export const handleRefreshRepositoryIndex = async (
  registry: ProjectRegistryStore,
  indexesDir: string,
  workspaceIdVal: unknown
): Promise<RefreshRepositoryIndexResponse> => {
  try {
    const workspaceId = typeof workspaceIdVal === 'string' ? workspaceIdVal : 'default';
    const projects = (await registry.readAll()).projects;
    const store = new JsonRepositoryIndexStore(indexesDir);
    const scanner = new ProjectScannerClient();
    const fingerprint = new NodeCryptoFingerprintClient(async (id) => {
      const p = projects.find((item) => item.id === id);
      return p?.rootPath;
    });
    const clock = { nowIso: () => new Date().toISOString() };
    const useCase = new RefreshRepositoryIndexUseCase({ store, scanner, fingerprint, clock });
    const result = await useCase.execute({ workspaceId, projects });
    const knowledge = await syncStructuredKnowledgeIndex({
      indexesDir,
      workspaceId,
      projects,
      repoIndex: result.index,
      changeSet: result.changeSet,
      rebuilt: result.rebuilt,
    });
    return {
      status: 'ready',
      metrics: result.metrics,
      rebuilt: result.rebuilt,
      knowledgeStatus: knowledge.status,
      knowledgeEntries: knowledge.entries,
    };
  } catch {
    return { status: 'degraded', rebuilt: false };
  }
};

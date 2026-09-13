import { describe, expect, it, vi } from 'vitest';
import { createRepositorySnapshot } from '../../../../domain/ir';
import type { RepositoryKnowledgeStore } from '../../persistence/RepositoryKnowledgeStore';
import { BuildRepositoryKnowledgeUseCase } from '../BuildRepositoryKnowledgeUseCase';
import { RebuildRepositoryKnowledgeUseCase } from '../RebuildRepositoryKnowledgeUseCase';

function createMockStore(): RepositoryKnowledgeStore {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    load: vi.fn().mockResolvedValue(null),
    findLatest: vi.fn().mockResolvedValue(null),
    findByRevision: vi.fn().mockResolvedValue(null),
    deleteSnapshot: vi.fn().mockResolvedValue(undefined),
    queryNeighbors: vi.fn().mockResolvedValue({ edges: [], targetNodes: [] }),
    getMetadata: vi.fn().mockResolvedValue(null),
    getStatistics: vi.fn().mockResolvedValue({
      snapshotCount: 0,
      nodeCount: 0,
      edgeCount: 0,
      evidenceCount: 0,
      dbSizeBytes: 0,
    }),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

describe('RepositoryKnowledgeUseCases', () => {
  const snapshot = createRepositorySnapshot({
    snapshotId: 'snap-1',
    repositoryId: 'repo-1',
    workspaceRoot: '/test',
    createdAt: '2026-09-13T00:00:00Z',
  });

  it('BuildRepositoryKnowledgeUseCase builds and saves IR to store', async () => {
    const store = createMockStore();
    const useCase = new BuildRepositoryKnowledgeUseCase();

    const result = await useCase.execute({ snapshot, store });
    expect(result.ir).toBeDefined();
    expect(result.savedAt).toBeDefined();
    expect(store.save).toHaveBeenCalledWith(result.ir);
  });

  it('RebuildRepositoryKnowledgeUseCase prunes previous snapshot if requested', async () => {
    const store = createMockStore();
    const oldSnapshot = createRepositorySnapshot({
      snapshotId: 'snap-0',
      repositoryId: 'repo-1',
      workspaceRoot: '/test',
      createdAt: '2026-09-12T00:00:00Z',
    });
    vi.mocked(store.findLatest).mockResolvedValue(oldSnapshot);

    const useCase = new RebuildRepositoryKnowledgeUseCase();
    const result = await useCase.execute({
      snapshot,
      store,
      pruneOldSnapshots: true,
    });

    expect(result.ir).toBeDefined();
    expect(store.save).toHaveBeenCalledWith(result.ir);
    expect(store.deleteSnapshot).toHaveBeenCalledWith('snap-0');
  });
});

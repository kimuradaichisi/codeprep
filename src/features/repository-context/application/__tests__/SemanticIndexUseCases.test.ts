import { beforeEach, describe, expect, it } from 'vitest';
import type { RepositoryIndexChangeSet } from '../../domain/RepositoryIndexChangeSet';
import type { StructuredKnowledgeIndex } from '../../domain/StructuredKnowledgeIndex';
import { FakeEmbeddingPort } from '../../infrastructure/embedding/FakeEmbeddingPort';
import { BuildSemanticIndexUseCase } from '../BuildSemanticIndexUseCase';
import { RefreshSemanticIndexUseCase } from '../RefreshSemanticIndexUseCase';
import { SemanticSearchUseCase } from '../SemanticSearchUseCase';
import type { SemanticIndexStore } from '../semanticIndexPorts';
import type { SemanticIndex } from '../../domain/SemanticIndex';

describe('SemanticIndex UseCases', () => {
  const workspaceId = 'ws-test';
  let embeddingPort: FakeEmbeddingPort;
  let inMemoryStore: SemanticIndexStore;
  let storedIndex: SemanticIndex | null;

  const sampleKnowledge: StructuredKnowledgeIndex = {
    metadata: {
      projectId: workspaceId,
      indexedAt: '2026-03-01T00:00:00.000Z',
      schemaVersion: 1,
      totalEntries: 2,
      markdownSectionCount: 1,
      codeSymbolCount: 1,
    },
    entries: [
      {
        entryId: `${workspaceId}:docs/refund.md#sec:1:Refund Policy:1`,
        projectId: workspaceId,
        relativePath: 'docs/refund.md',
        kind: 'markdown-section',
        headingLevel: 1,
        headingText: 'Refund Policy',
        headingPath: ['Refund Policy'],
        startLine: 1,
        endLine: 5,
        content: '# Refund Policy\nDuplicates prohibited.',
      },
      {
        entryId: `${workspaceId}:src/OrderService.ts#sym:method:OrderService.refund:10`,
        projectId: workspaceId,
        relativePath: 'src/OrderService.ts',
        kind: 'code-symbol',
        symbolKind: 'method',
        symbolName: 'refund',
        containerName: 'OrderService',
        signature: 'refund(): void',
        docComment: '/** Prevents duplicate refunds. */',
        startLine: 10,
        endLine: 15,
      },
    ],
  };

  beforeEach(() => {
    embeddingPort = new FakeEmbeddingPort({ dimensions: 8 });
    storedIndex = null;
    inMemoryStore = {
      load: async () => storedIndex,
      save: async (idx) => {
        storedIndex = idx;
      },
      remove: async () => {
        storedIndex = null;
      },
    };
  });

  it('builds full semantic index and saves metadata', async () => {
    const buildUseCase = new BuildSemanticIndexUseCase(embeddingPort, inMemoryStore);
    const index = await buildUseCase.execute(sampleKnowledge);

    expect(index.metadata.workspaceId).toBe(workspaceId);
    expect(index.metadata.embeddingDimensions).toBe(8);
    expect(index.entries).toHaveLength(2);
    expect(embeddingPort.embedCalls).toBe(1);
    expect(storedIndex).toEqual(index);
  });

  it('refreshes with no changes without calling embed', async () => {
    const buildUseCase = new BuildSemanticIndexUseCase(embeddingPort, inMemoryStore);
    await buildUseCase.execute(sampleKnowledge);
    embeddingPort.embedCalls = 0;

    const refreshUseCase = new RefreshSemanticIndexUseCase(embeddingPort, inMemoryStore, buildUseCase);
    const changeSet: RepositoryIndexChangeSet = {
      added: [],
      modified: [],
      deleted: [],
      unchangedCount: 2,
    };

    const refreshed = await refreshUseCase.execute(workspaceId, sampleKnowledge, changeSet);
    expect(refreshed.entries).toHaveLength(2);
    expect(embeddingPort.embedCalls).toBe(0);
  });

  it('rebuilds fully when embedding model or dimension changes', async () => {
    const buildUseCase = new BuildSemanticIndexUseCase(embeddingPort, inMemoryStore);
    await buildUseCase.execute(sampleKnowledge);

    const newPort = new FakeEmbeddingPort({ modelId: 'new-model-v2', dimensions: 8 });
    const refreshUseCase = new RefreshSemanticIndexUseCase(newPort, inMemoryStore, new BuildSemanticIndexUseCase(newPort, inMemoryStore));

    const changeSet: RepositoryIndexChangeSet = { added: [], modified: [], deleted: [], unchangedCount: 2 };
    const refreshed = await refreshUseCase.execute(workspaceId, sampleKnowledge, changeSet);

    expect(refreshed.metadata.embeddingModel).toBe('new-model-v2');
    expect(newPort.embedCalls).toBe(1);
  });

  it('searches semantic entries with topK and minScore filtering', async () => {
    const buildUseCase = new BuildSemanticIndexUseCase(embeddingPort, inMemoryStore);
    await buildUseCase.execute(sampleKnowledge);

    const searchUseCase = new SemanticSearchUseCase(embeddingPort, inMemoryStore);
    const hits = await searchUseCase.execute({
      workspaceId,
      query: 'refund duplicates',
      topK: 5,
      minScore: 0.1,
    });

    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].score).toBeGreaterThanOrEqual(hits[hits.length - 1].score);
    expect(hits.map((h) => h.relativePath)).toContain('docs/refund.md');
  });
});

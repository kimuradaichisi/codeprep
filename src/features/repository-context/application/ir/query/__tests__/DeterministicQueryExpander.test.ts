// src/features/repository-context/application/ir/query/__tests__/DeterministicQueryExpander.test.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect } from 'vitest';
import { DeterministicQueryExpander } from '../DeterministicQueryExpander';
import { RepositoryVocabularyIndex } from '../RepositoryVocabularyIndex';
import { createRepositoryNode } from '../../../../domain/ir';
import type { RepositoryKnowledgeStore } from '../../persistence';

function createMockStore(nodes: readonly any[]): RepositoryKnowledgeStore {
  return {
    save: async () => {},
    load: async () => null,
    findLatest: async () => null,
    findByRevision: async () => null,
    deleteSnapshot: async () => {},
    queryNeighbors: async () => ({ edges: [], targetNodes: [] }),
    findNodes: async () => nodes,
    getStatistics: async () => ({ snapshotCount: 1, nodeCount: nodes.length, edgeCount: 0, evidenceCount: 0, dbSizeBytes: 0 }),
    close: async () => {},
  } as unknown as RepositoryKnowledgeStore;
}

describe('DeterministicQueryExpander', () => {
  it('expands compound terms with high coverage and provides trace', async () => {
    const mockNodes = [
      createRepositoryNode({
        id: 'n:file:RepositoryIndexMapper.ts',
        snapshotId: 'snap-1',
        kind: 'file',
        name: 'RepositoryIndexMapper.ts',
        path: 'src/features/repository-context/application/ir/mappers/RepositoryIndexMapper.ts',
      }),
      createRepositoryNode({
        id: 'n:file:BuildRepositoryIRUseCase.ts',
        snapshotId: 'snap-1',
        kind: 'file',
        name: 'BuildRepositoryIRUseCase.ts',
        path: 'src/features/repository-context/application/ir/BuildRepositoryIRUseCase.ts',
      }),
    ];

    RepositoryVocabularyIndex.clearCache();
    const vocab = await RepositoryVocabularyIndex.getOrBuild('snap-1', createMockStore(mockNodes));

    const task = '既存のRepositoryIndexをRepository IRへ変換するMapperとBuild UseCaseを実装する。';
    const result = DeterministicQueryExpander.expand(task, vocab);

    expect(result.expandedTerms.length).toBeGreaterThan(0);
    expect(result.trace.originalTerms.length).toBeGreaterThan(0);
    expect(result.trace.normalizedTerms).toBeDefined();

    const compoundExp = result.trace.expansions.find(e => e.expandedTerm === 'RepositoryIndexMapper');
    expect(compoundExp).toBeDefined();
    expect(compoundExp?.method).toBe('term-family');
  });
});

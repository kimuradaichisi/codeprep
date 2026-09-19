// src/features/repository-context/application/ir/query/__tests__/SeedScorer.test.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect } from 'vitest';
import { SeedScorer } from '../SeedScorer';
import { createRepositoryNode } from '../../../../domain/ir';

describe('SeedScorer', () => {
  const fileNode = createRepositoryNode({
    id: 'n:file:RepositoryIndexMapper.ts',
    snapshotId: 'snap-1',
    kind: 'file',
    name: 'RepositoryIndexMapper.ts',
    path: 'src/features/repository-context/application/ir/mappers/RepositoryIndexMapper.ts',
  });

  const symNode = createRepositoryNode({
    id: 'n:sym:RepositoryIndexMapper',
    snapshotId: 'snap-1',
    kind: 'symbol',
    name: 'RepositoryIndexMapper',
    path: 'src/features/repository-context/application/ir/mappers/RepositoryIndexMapper.ts',
  });

  it('scores exact symbol match with bonus', () => {
    const res = SeedScorer.calculate('RepositoryIndexMapper', symNode, {
      sourceTerm: 'RepositoryIndexMapper',
      expandedTerm: 'RepositoryIndexMapper',
      method: 'exact',
      evidence: 'test',
      scoreAdjustment: 0.02,
    });
    expect(res.score).toBe(0.98);
    expect(res.matchType).toBe('symbol-name');
  });

  it('scores exact filename match without .ts extension in query', () => {
    const res = SeedScorer.calculate('RepositoryIndexMapper', fileNode, {
      sourceTerm: 'repository index mapper',
      expandedTerm: 'RepositoryIndexMapper',
      method: 'term-family',
      evidence: 'compound',
      scoreAdjustment: 0.04,
    });
    expect(res.score).toBe(1.0);
    expect(res.matchType).toBe('filename');
  });

  it('applies non-production penalty for test files', () => {
    const testFile = createRepositoryNode({
      id: 'n:file:test',
      snapshotId: 'snap-1',
      kind: 'file',
      name: 'RepositoryIndexMapper.test.ts',
      path: 'src/features/repository-context/application/ir/__tests__/RepositoryIndexMapper.test.ts',
    });
    const res = SeedScorer.calculate('RepositoryIndexMapper.test', testFile, {
      sourceTerm: 'test',
      expandedTerm: 'RepositoryIndexMapper.test',
      method: 'exact',
      evidence: 'test',
      scoreAdjustment: 0.02,
    });
    // 0.96 - 0.04 (penalty) + 0.02 = 0.94
    expect(res.score).toBe(0.94);
  });
});

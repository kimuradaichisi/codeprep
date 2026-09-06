import { describe, expect, it } from 'vitest';
import {
  CURRENT_INDEX_SCHEMA_VERSION,
  sortIndexEntries,
  type RepositoryIndexEntry,
} from '../RepositoryIndex';
import {
  createEmptyChangeSet,
  toIndexMetrics,
} from '../RepositoryIndexChangeSet';

describe('RepositoryIndex', () => {
  it('sorts entries by projectId ASC then relativePath ASC', () => {
    const entries: RepositoryIndexEntry[] = [
      { projectId: 'p2', relativePath: 'src/b.ts', kind: 'code', size: 100, contentHash: 'h1' },
      { projectId: 'p1', relativePath: 'src/z.ts', kind: 'code', size: 200, contentHash: 'h2' },
      { projectId: 'p1', relativePath: 'src/a.ts', kind: 'code', size: 300, contentHash: 'h3' },
    ];

    const sorted = sortIndexEntries(entries);
    expect(sorted[0].projectId).toBe('p1');
    expect(sorted[0].relativePath).toBe('src/a.ts');
    expect(sorted[1].projectId).toBe('p1');
    expect(sorted[1].relativePath).toBe('src/z.ts');
    expect(sorted[2].projectId).toBe('p2');
  });

  it('provides CURRENT_INDEX_SCHEMA_VERSION = 1', () => {
    expect(CURRENT_INDEX_SCHEMA_VERSION).toBe(1);
  });
});

describe('RepositoryIndexChangeSet', () => {
  it('calculates metrics from changeset correctly', () => {
    const changeSet = {
      added: [{ projectId: 'p1', relativePath: 'src/add.ts', kind: 'code' as const, size: 10, contentHash: 'h' }],
      modified: [{ projectId: 'p1', relativePath: 'src/mod.ts', kind: 'code' as const, size: 20, contentHash: 'h' }],
      deleted: [{ projectId: 'p1', relativePath: 'src/del.ts', kind: 'code' as const, size: 30, contentHash: 'h' }],
      unchangedCount: 5,
    };

    const metrics = toIndexMetrics(changeSet, 7, 2, 150);
    expect(metrics.totalFiles).toBe(7);
    expect(metrics.added).toBe(1);
    expect(metrics.modified).toBe(1);
    expect(metrics.deleted).toBe(1);
    expect(metrics.unchanged).toBe(5);
    expect(metrics.hashedFiles).toBe(2);
    expect(metrics.durationMs).toBe(150);
  });

  it('creates empty changeset', () => {
    const cs = createEmptyChangeSet();
    expect(cs.added).toEqual([]);
    expect(cs.unchangedCount).toBe(0);
  });
});

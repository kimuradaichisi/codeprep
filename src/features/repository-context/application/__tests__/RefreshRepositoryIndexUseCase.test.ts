import { describe, expect, it, vi } from 'vitest';
import type { Project } from '../../domain/Project';
import type { RepositoryIndex } from '../../domain/RepositoryIndex';
import { RefreshRepositoryIndexUseCase } from '../RefreshRepositoryIndexUseCase';
import type {
  ClockPort,
  RepositoryFingerprintPort,
  RepositoryIndexStore,
  RepositoryScannerPort,
} from '../repositoryIndexPorts';

describe('RefreshRepositoryIndexUseCase', () => {
  const dummyClock: ClockPort = { nowIso: () => '2026-09-06T12:05:00Z' };

  const project: Project = { id: 'p1', name: 'P1', rootPath: '/p1', excludePatterns: [] };

  it('rebuilds index when no existing index is stored', async () => {
    let savedIndex: RepositoryIndex | undefined;
    const store: RepositoryIndexStore = {
      load: vi.fn(async () => undefined),
      save: vi.fn(async (idx) => { savedIndex = idx; }),
      remove: vi.fn(async () => undefined),
    };
    const scanner: RepositoryScannerPort = {
      scanProjectFiles: vi.fn(async () => [{ relativePath: 'src/main.ts', size: 100 }]),
    };
    const fingerprint: RepositoryFingerprintPort = { computeHash: vi.fn(async () => 'hash1') };

    const useCase = new RefreshRepositoryIndexUseCase({ store, scanner, fingerprint, clock: dummyClock });
    const result = await useCase.execute({ workspaceId: 'ws-1', projects: [project] });

    expect(result.rebuilt).toBe(true);
    expect(result.changeSet.added.length).toBe(1);
    expect(savedIndex?.entries.length).toBe(1);
  });

  it('rebuilds index when schemaVersion does not match', async () => {
    const corruptIndex: RepositoryIndex = {
      metadata: { workspaceId: 'ws-1', schemaVersion: 999, createdAt: 'old', updatedAt: 'old' },
      entries: [],
    };
    const store: RepositoryIndexStore = {
      load: vi.fn(async () => corruptIndex),
      save: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
    };
    const scanner: RepositoryScannerPort = { scanProjectFiles: vi.fn(async () => []) };
    const fingerprint: RepositoryFingerprintPort = { computeHash: vi.fn(async () => 'hash') };

    const useCase = new RefreshRepositoryIndexUseCase({ store, scanner, fingerprint, clock: dummyClock });
    const result = await useCase.execute({ workspaceId: 'ws-1', projects: [project] });

    expect(result.rebuilt).toBe(true);
  });

  it('performs incremental refresh with added, modified, deleted, and unchanged entries', async () => {
    const existingIndex: RepositoryIndex = {
      metadata: { workspaceId: 'ws-1', schemaVersion: 1, createdAt: '2026-09-06T10:00:00Z', updatedAt: '2026-09-06T10:00:00Z' },
      entries: [
        { projectId: 'p1', relativePath: 'src/same.ts', kind: 'code', size: 100, contentHash: 'h-same', mtimeMs: 1000 },
        { projectId: 'p1', relativePath: 'src/modified.ts', kind: 'code', size: 200, contentHash: 'h-old', mtimeMs: 2000 },
        { projectId: 'p1', relativePath: 'src/deleted.ts', kind: 'code', size: 300, contentHash: 'h-del' },
      ],
    };

    let savedIndex: RepositoryIndex | undefined;
    const store: RepositoryIndexStore = {
      load: vi.fn(async () => existingIndex),
      save: vi.fn(async (idx) => { savedIndex = idx; }),
      remove: vi.fn(async () => undefined),
    };

    const scanner: RepositoryScannerPort = {
      scanProjectFiles: vi.fn(async () => [
        { relativePath: 'src/same.ts', size: 100, mtimeMs: 1000 }, // same size & mtime -> unchanged (no hash needed)
        { relativePath: 'src/modified.ts', size: 250, mtimeMs: 2500 }, // size changed -> compute hash
        { relativePath: 'src/new.ts', size: 400, mtimeMs: 3000 }, // new file -> compute hash
      ]),
    };

    const computeHashMock = vi.fn(async (_pId: string, path: string) => `h-${path}`);
    const fingerprint: RepositoryFingerprintPort = { computeHash: computeHashMock };

    const useCase = new RefreshRepositoryIndexUseCase({ store, scanner, fingerprint, clock: dummyClock });
    const result = await useCase.execute({ workspaceId: 'ws-1', projects: [project] });

    expect(result.rebuilt).toBe(false);
    expect(result.changeSet.unchangedCount).toBe(1);
    expect(result.changeSet.modified.map(e => e.relativePath)).toEqual(['src/modified.ts']);
    expect(result.changeSet.added.map(e => e.relativePath)).toEqual(['src/new.ts']);
    expect(result.changeSet.deleted.map(e => e.relativePath)).toEqual(['src/deleted.ts']);

    // same.ts はサイズとmtimeが一致しているため hash 再計算がスキップされたことを検証
    expect(computeHashMock).not.toHaveBeenCalledWith('p1', 'src/same.ts');
    expect(computeHashMock).toHaveBeenCalledWith('p1', 'src/modified.ts');
    expect(computeHashMock).toHaveBeenCalledWith('p1', 'src/new.ts');

    expect(savedIndex?.entries.length).toBe(3);
    expect(savedIndex?.metadata.updatedAt).toBe('2026-09-06T12:05:00Z');
  });

  it('detects modification when file has same path and same size but different content', async () => {
    const existingIndex: RepositoryIndex = {
      metadata: { workspaceId: 'ws-1', schemaVersion: 1, createdAt: 't', updatedAt: 't' },
      entries: [
        { projectId: 'p1', relativePath: 'src/data.json', kind: 'config', size: 10, contentHash: 'hash-aaa', mtimeMs: 1000 },
      ],
    };
    const store: RepositoryIndexStore = {
      load: vi.fn(async () => existingIndex),
      save: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
    };
    const scanner: RepositoryScannerPort = {
      scanProjectFiles: vi.fn(async () => [
        { relativePath: 'src/data.json', size: 10, mtimeMs: 1001 },
      ]),
    };
    const fingerprint: RepositoryFingerprintPort = {
      computeHash: vi.fn(async () => 'hash-bbb'),
    };

    const useCase = new RefreshRepositoryIndexUseCase({ store, scanner, fingerprint, clock: dummyClock });
    const result = await useCase.execute({ workspaceId: 'ws-1', projects: [project] });

    expect(result.changeSet.modified.length).toBe(1);
    expect(result.changeSet.modified[0].relativePath).toBe('src/data.json');
    expect(result.changeSet.modified[0].contentHash).toBe('hash-bbb');
    expect(result.changeSet.unchangedCount).toBe(0);
  });
});

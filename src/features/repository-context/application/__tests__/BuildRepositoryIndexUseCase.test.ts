import { describe, expect, it, vi } from 'vitest';
import type { Project } from '../../domain/Project';
import type { RepositoryIndex } from '../../domain/RepositoryIndex';
import { BuildRepositoryIndexUseCase } from '../BuildRepositoryIndexUseCase';
import type {
  ClockPort,
  RepositoryFingerprintPort,
  RepositoryIndexStore,
  RepositoryScannerPort,
} from '../repositoryIndexPorts';

describe('BuildRepositoryIndexUseCase', () => {
  const dummyClock: ClockPort = { nowIso: () => '2026-09-06T12:00:00Z' };

  it('builds an empty index when projects are empty', async () => {
    let savedIndex: RepositoryIndex | undefined;
    const store: RepositoryIndexStore = {
      load: vi.fn(async () => undefined),
      save: vi.fn(async (idx) => { savedIndex = idx; }),
      remove: vi.fn(async () => undefined),
    };
    const scanner: RepositoryScannerPort = { scanProjectFiles: vi.fn(async () => []) };
    const fingerprint: RepositoryFingerprintPort = { computeHash: vi.fn(async () => 'hash1') };

    const useCase = new BuildRepositoryIndexUseCase({ store, scanner, fingerprint, clock: dummyClock });
    const result = await useCase.execute({ workspaceId: 'ws-1', projects: [] });

    expect(result.index.entries).toEqual([]);
    expect(result.changeSet.added).toEqual([]);
    expect(result.metrics.totalFiles).toBe(0);
    expect(savedIndex?.metadata.workspaceId).toBe('ws-1');
  });

  it('scans projects, computes hashes, and sorts entries deterministically', async () => {
    const projects: Project[] = [
      { id: 'p-b', name: 'B', rootPath: '/b', excludePatterns: [] },
      { id: 'p-a', name: 'A', rootPath: '/a', excludePatterns: [] },
    ];
    let savedIndex: RepositoryIndex | undefined;
    const store: RepositoryIndexStore = {
      load: vi.fn(async () => undefined),
      save: vi.fn(async (idx) => { savedIndex = idx; }),
      remove: vi.fn(async () => undefined),
    };
    const scanner: RepositoryScannerPort = {
      scanProjectFiles: vi.fn(async (project) => {
        if (project.id === 'p-b') return [{ relativePath: 'src/main.ts', size: 100 }];
        return [
          { relativePath: 'src/order/OrderService.ts', size: 200 },
          { relativePath: 'docs/guide.md', size: 50 },
        ];
      }),
    };
    const fingerprint: RepositoryFingerprintPort = {
      computeHash: vi.fn(async (_pId, path) => `hash-${path}`),
    };

    const useCase = new BuildRepositoryIndexUseCase({ store, scanner, fingerprint, clock: dummyClock });
    const result = await useCase.execute({ workspaceId: 'ws-1', projects });

    expect(result.index.entries.length).toBe(3);
    // ソート順序: projectId ASC, relativePath ASC
    expect(result.index.entries[0].projectId).toBe('p-a');
    expect(result.index.entries[0].relativePath).toBe('docs/guide.md');
    expect(result.index.entries[0].kind).toBe('document');
    expect(result.index.entries[1].projectId).toBe('p-a');
    expect(result.index.entries[1].relativePath).toBe('src/order/OrderService.ts');
    expect(result.index.entries[1].kind).toBe('code');
    expect(result.index.entries[2].projectId).toBe('p-b');
    expect(result.metrics.totalFiles).toBe(3);
    expect(result.changeSet.added.length).toBe(3);
    expect(savedIndex).toEqual(result.index);
  });
});

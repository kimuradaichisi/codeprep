import { describe, expect, it } from 'vitest';
import type { RepositoryIndex } from '../../../domain/RepositoryIndex';
import { createRepositorySnapshot } from '../../../domain/ir';
import { mapRepositoryIndexToFileNodes } from '../mappers/RepositoryIndexMapper';

describe('RepositoryIndexMapper', () => {
  const snapshot = createRepositorySnapshot({
    snapshotId: 'snap-1',
    repositoryId: 'repo-1',
    workspaceRoot: '/workspace',
    createdAt: '2026-09-13T00:00:00Z',
  });

  it('maps repository index entries to FILE nodes with deterministic IDs', () => {
    const index: RepositoryIndex = {
      metadata: {
        workspaceId: 'repo-1',
        schemaVersion: 1,
        createdAt: '2026-09-13T00:00:00Z',
        updatedAt: '2026-09-13T00:00:00Z',
      },
      entries: [
        {
          projectId: 'repo-1',
          relativePath: 'src/index.ts',
          kind: 'code',
          size: 512,
          contentHash: 'hash-abc',
          mtimeMs: 12345678,
          extension: '.ts',
        },
        {
          projectId: 'repo-1',
          relativePath: 'tsconfig.json',
          kind: 'config',
          size: 256,
          contentHash: 'hash-cfg',
          extension: '.json',
        },
      ],
    };

    const nodes = mapRepositoryIndexToFileNodes(index, snapshot);
    expect(nodes).toHaveLength(2);

    const fileNode = nodes[0];
    expect(fileNode.id).toBe('node:snap-1:file:src/index.ts');
    expect(fileNode.kind).toBe('file');
    expect(fileNode.path).toBe('src/index.ts');
    expect(fileNode.metadata?.fileSize).toBe(512);
    expect(fileNode.metadata?.contentHash).toBe('hash-abc');

    const configNode = nodes[1];
    expect(configNode.id).toBe('node:snap-1:file:tsconfig.json');
    expect(configNode.kind).toBe('config');
  });

  it('prevents duplicate file nodes when identical paths exist in index', () => {
    const index: RepositoryIndex = {
      metadata: {
        workspaceId: 'repo-1',
        schemaVersion: 1,
        createdAt: '2026-09-13T00:00:00Z',
        updatedAt: '2026-09-13T00:00:00Z',
      },
      entries: [
        { projectId: 'repo-1', relativePath: 'src/dup.ts', kind: 'code', size: 10, contentHash: 'h1' },
        { projectId: 'repo-1', relativePath: 'src/dup.ts', kind: 'code', size: 10, contentHash: 'h1' },
      ],
    };

    const nodes = mapRepositoryIndexToFileNodes(index, snapshot);
    expect(nodes).toHaveLength(1);
  });
});

import { describe, expect, it } from 'vitest';
import {
  buildFileNodeId,
  buildSymbolNodeId,
  createRepositoryNode,
  isValidNode,
} from '../RepositoryNode';

describe('RepositoryNode', () => {
  const snapshotId = 'snap-100';

  it('creates a valid file node with stable id', () => {
    const id = buildFileNodeId(snapshotId, 'src/features/selection/index.ts');
    const node = createRepositoryNode({
      id,
      snapshotId,
      kind: 'file',
      name: 'index.ts',
      path: 'src/features/selection/index.ts',
      language: 'typescript',
      metadata: { fileSize: 1024 },
    });

    expect(node.id).toBe('node:snap-100:file:src/features/selection/index.ts');
    expect(node.kind).toBe('file');
    expect(node.metadata?.fileSize).toBe(1024);
  });

  it('creates a valid symbol node with location', () => {
    const id = buildSymbolNodeId(snapshotId, 'src/foo.ts', 'class', 'FooService', 10);
    const node = createRepositoryNode({
      id,
      snapshotId,
      kind: 'symbol',
      name: 'FooService',
      path: 'src/foo.ts',
      location: { startLine: 10, endLine: 35 },
      language: 'typescript',
    });

    expect(node.id).toBe('node:snap-100:sym:src/foo.ts#class:FooService:10');
    expect(node.location?.startLine).toBe(10);
  });

  it('rejects invalid node with missing required properties', () => {
    expect(isValidNode({
      id: '',
      snapshotId,
      kind: 'file',
      name: 'foo.ts',
      path: 'foo.ts',
    })).toBe(false);

    expect(() => createRepositoryNode({
      id: '',
      snapshotId,
      kind: 'file',
      name: 'foo.ts',
      path: 'foo.ts',
    })).toThrowError(/Invalid RepositoryNode/);
  });

  it('rejects node with invalid location lines', () => {
    expect(isValidNode({
      id: 'node:1',
      snapshotId,
      kind: 'symbol',
      name: 'badLoc',
      path: 'foo.ts',
      location: { startLine: 20, endLine: 10 },
    })).toBe(false);
  });
});

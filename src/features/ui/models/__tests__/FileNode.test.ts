/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect, vi } from 'vitest';
import { FileNode } from '../FileNode';

vi.mock('vscode', () => ({
  Uri: {
    file: vi.fn((p) => ({ scheme: 'file', fsPath: p, path: p }))
  }
}));

describe('FileNode', () => {
  it('通常のファイルノードを構築できること', () => {
    const node = new FileNode({
      label: 'test.ts',
      fullPath: '/path/to/test.ts',
      relativePath: 'test.ts',
      isDirectory: false
    });
    expect(node.label).toBe('test.ts');
    expect(node.fullPath).toBe('/path/to/test.ts');
    expect(node.relativePath).toBe('test.ts');
    expect(node.isDirectory).toBe(false);
    expect(node.isLoading).toBe(false);
  });

  it('createLoadingNode でローディングスピナーノードを生成できること', () => {
    const node = FileNode.createLoadingNode('読み込み中...');
    expect(node.label).toBe('読み込み中...');
    expect(node.isLoading).toBe(true);
    expect(node.isDirectory).toBe(false);
  });
});

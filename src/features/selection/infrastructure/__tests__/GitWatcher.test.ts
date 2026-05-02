import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { GitWatcher } from '../GitWatcher';
import { GitUtils } from '../../../../utils/git';

vi.mock('vscode', () => ({
  workspace: {
    createFileSystemWatcher: vi.fn(() => ({
      onDidChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      onDidCreate: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      onDidDelete: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      dispose: vi.fn(),
    })),
  },
  RelativePattern: vi.fn(),
}));

vi.mock('../../../../utils/git', () => ({
  GitUtils: {
    getModifiedFiles: vi.fn(),
  },
}));

describe('GitWatcher', () => {
  const mockRoot = '/mock/root';
  let watcher: GitWatcher;

  beforeEach(async () => {
    vi.clearAllMocks();
    (GitUtils.getModifiedFiles as any).mockResolvedValue(['file1.ts', 'file2.ts']);
    watcher = new GitWatcher(mockRoot);
    // コンストラクタ内の非同期 updateCache を待機
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  it('初期化時に Git 状態を取得し、キャッシュに保持すること', () => {
    expect(watcher.isModified('file1.ts')).toBe(true);
    expect(watcher.isModified('file2.ts')).toBe(true);
    expect(watcher.isModified('unknown.ts')).toBe(false);
    expect(watcher.getModifiedFiles()).toEqual(['file1.ts', 'file2.ts']);
  });

  it('updateCache を明示的に呼び出すと最新の Git 状態を取得すること', async () => {
    (GitUtils.getModifiedFiles as any).mockResolvedValue(['new_file.ts']);
    await watcher.updateCache();
    expect(watcher.getModifiedFiles()).toEqual(['new_file.ts']);
    expect(watcher.isModified('file1.ts')).toBe(false);
  });

  it('FileSystemWatcher が正しく設定されていること', () => {
    expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalled();
  });

  it('dispose 時にすべてのリソース（watcher およびイベント登録）を解放すること', () => {
    const mockWatcher = (vscode.workspace.createFileSystemWatcher as any).mock.results[0].value;
    watcher.dispose();
    expect(mockWatcher.dispose).toHaveBeenCalled();
  });
});

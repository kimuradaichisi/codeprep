import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { GitWatcher } from '../GitWatcher';
import { ok } from '../../../../shared/domain/Result';

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

describe('GitWatcher', () => {
  const mockRoot = '/mock/root';
  let watcher: GitWatcher;
  let mockGitClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGitClient = {
      getModifiedFiles: vi.fn().mockResolvedValue(ok(['file1.ts', 'file2.ts'])),
    };
    watcher = new GitWatcher(mockRoot, mockGitClient);
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
    mockGitClient.getModifiedFiles.mockResolvedValue(ok(['new_file.ts']));
    await watcher.updateCache();
    expect(watcher.getModifiedFiles()).toEqual(['new_file.ts']);
    expect(watcher.isModified('file1.ts')).toBe(false);
  });

  it('FileSystemWatcher が正しく設定されていること', () => {
    expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalled();
  });

  it('複数の変更イベントが発生しても、1秒後に1回だけ更新されること', async () => {
    vi.useFakeTimers();
    const mockWatcher = (vscode.workspace.createFileSystemWatcher as any).mock.results[0].value;
    const onChangeCallback = mockWatcher.onDidChange.mock.calls[0][0];

    // 3回連続でイベントを発生させる
    onChangeCallback();
    onChangeCallback();
    onChangeCallback();

    // まだ実行されていないことを確認
    expect(mockGitClient.getModifiedFiles).toHaveBeenCalledTimes(1); // 初期化時の1回のみ

    // 1秒進める
    vi.advanceTimersByTime(1000);
    await vi.runAllTimersAsync();

    // 1回だけ追加で実行されたことを確認
    expect(mockGitClient.getModifiedFiles).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('dispose 時にすべてのリソース（watcher およびイベント登録）を解放すること', () => {

    const mockWatcher = (vscode.workspace.createFileSystemWatcher as any).mock.results[0].value;
    watcher.dispose();
    expect(mockWatcher.dispose).toHaveBeenCalled();
  });
});


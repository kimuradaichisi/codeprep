import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { VSCodeSearchRepository } from '../VSCodeSearchRepository';

// VSCode APIのモック
vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn(),
  },
  commands: {
    executeCommand: vi.fn(),
  },
  Uri: {
    file: (p: string) => ({ fsPath: p, scheme: 'file' }),
  },
}));

// パスユーティリティのモック
vi.mock('../../../../utils/path', () => ({
  getRelativePath: vi.fn((root, target) => target.replace(root + '/', '')),
}));

describe('VSCodeSearchRepository', () => {
  const mockRoot = '/mock/root';
  let repository: VSCodeSearchRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new VSCodeSearchRepository(mockRoot);

    // デフォルトの設定モック
    (vscode.workspace.getConfiguration as any).mockReturnValue({
      get: vi.fn((key: string, def: any) => (key === 'exclude' ? [] : def)),
    });
  });

  it('正常系: executeCommand を使用して高速検索を行い、結果を返すこと', async () => {
    // vscode.executeTextSearch の挙動をモック
    (vscode.commands.executeCommand as any).mockImplementation(
      (cmd: string, patternInfo: any, options: any, progress: any) => {
        if (cmd === 'vscode.executeTextSearch') {
          // ダミーのマッチ結果を報告
          progress.report({ uri: vscode.Uri.file(`${mockRoot}/src/match.ts`) });
          progress.report({ uri: vscode.Uri.file(`${mockRoot}/src/match.ts`) }); // 重複テスト用
        }
        return Promise.resolve();
      }
    );

    const results = await repository.search('keyword');

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'vscode.executeTextSearch',
      expect.objectContaining({ pattern: 'keyword' }),
      expect.objectContaining({ useIgnoreFiles: true }),
      expect.any(Object)
    );

    // 結果が重複排除され、相対パスになっていること
    expect(results).toEqual(['src/match.ts']);
    expect(results).toHaveLength(1);
  });

  it('設定: 除外パターンが options.excludes に渡されること', async () => {
    (vscode.workspace.getConfiguration as any).mockReturnValue({
      get: vi.fn((key: string) => (key === 'exclude' ? ['node_modules', 'dist'] : [])),
    });

    (vscode.commands.executeCommand as any).mockResolvedValue(Promise.resolve());

    await repository.search('query');

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'vscode.executeTextSearch',
      expect.any(Object),
      expect.objectContaining({
        excludes: ['node_modules', 'dist']
      }),
      expect.any(Object)
    );
  });

  it('境界値: 検索結果が空の場合、空配列を返すこと', async () => {
    (vscode.commands.executeCommand as any).mockResolvedValue(Promise.resolve());
    const results = await repository.search('query');
    expect(results).toEqual([]);
  });
});
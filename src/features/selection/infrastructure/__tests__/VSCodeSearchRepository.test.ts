import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { VSCodeSearchRepository } from '../VSCodeSearchRepository';
import * as pathUtils from '../../../../utils/path';

// VSCode APIのモック
vi.mock('vscode', () => ({
  workspace: {
    findFiles: vi.fn(),
    fs: {
      readFile: vi.fn(),
    },
    getConfiguration: vi.fn(),
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

  it('正常系: クエリに一致するファイルのみを抽出して相対パスで返すこと', async () => {
    const file1 = vscode.Uri.file(`${mockRoot}/src/match.ts`);
    const file2 = vscode.Uri.file(`${mockRoot}/src/ignore.ts`);
    
    (vscode.workspace.findFiles as any).mockResolvedValue([file1, file2]);
    
    // 内容のモック
    (vscode.workspace.fs.readFile as any).mockImplementation(async (uri: any) => {
      if (uri.fsPath.includes('match.ts')) return new TextEncoder().encode('target keyword here');
      return new TextEncoder().encode('nothing');
    });

    const results = await repository.search('keyword');

    expect(results).toEqual(['src/match.ts']);
    expect(results).not.toContain('src/ignore.ts');
  });

  it('正常系: 大文字小文字を区別せずに検索できること', async () => {
    const file = vscode.Uri.file(`${mockRoot}/test.ts`);
    (vscode.workspace.findFiles as any).mockResolvedValue([file]);
    (vscode.workspace.fs.readFile as any).mockResolvedValue(new TextEncoder().encode('HELLO WORLD'));

    const results = await repository.search('hello');

    expect(results).toHaveLength(1);
    expect(results[0]).toBe('test.ts');
  });

  it('異常系: readFileが失敗したファイルをスキップし、他のファイルの処理を継続すること', async () => {
    const file1 = vscode.Uri.file(`${mockRoot}/error.ts`);
    const file2 = vscode.Uri.file(`${mockRoot}/ok.ts`);
    
    (vscode.workspace.findFiles as any).mockResolvedValue([file1, file2]);
    
    (vscode.workspace.fs.readFile as any)
      .mockRejectedValueOnce(new Error('Read fail'))
      .mockResolvedValueOnce(new TextEncoder().encode('match'));

    const results = await repository.search('match');

    expect(results).toEqual(['ok.ts']);
    expect(results).toHaveLength(1);
  });

  it('設定: 除外パターンが正しく findFiles に渡されること', async () => {
    (vscode.workspace.getConfiguration as any).mockReturnValue({
      get: vi.fn((key: string) => (key === 'exclude' ? ['node_modules', 'dist'] : [])),
    });

    (vscode.workspace.findFiles as any).mockResolvedValue([]);

    await repository.search('query');

    expect(vscode.workspace.findFiles).toHaveBeenCalledWith(
      '**/*',
      '{node_modules,dist}'
    );
  });

  it('境界値: 検索結果が空の場合、空配列を返すこと', async () => {
    (vscode.workspace.findFiles as any).mockResolvedValue([]);
    const results = await repository.search('query');
    expect(results).toEqual([]);
  });

  it('境界値: チャンクサイズ（50）を超えるファイル数でも、全てのファイルが検索対象になること', async () => {
    // 60個のファイルを生成
    const mockUris = Array.from({ length: 60 }, (_, i) => 
      vscode.Uri.file(`${mockRoot}/file${i}.ts`)
    );
    (vscode.workspace.findFiles as any).mockResolvedValue(mockUris);
    
    // 全ての中身を "match" にする
    (vscode.workspace.fs.readFile as any).mockResolvedValue(new TextEncoder().encode('match'));

    const results = await repository.search('match');

    // 全てのファイルがヒットすることを確認
    expect(results).toHaveLength(60);
    // readFileが60回呼ばれていることを確認
    expect(vscode.workspace.fs.readFile).toHaveBeenCalledTimes(60);
  });
});
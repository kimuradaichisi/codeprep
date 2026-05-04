import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { VSCodeSearchRepository } from '../VSCodeSearchRepository';

vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn(),
    findTextInFiles: vi.fn(),
    findFiles: vi.fn(),
    fs: { readFile: vi.fn() }
  },
  commands: {
    executeCommand: vi.fn(),
  },
  Uri: {
    file: (p: string) => ({ fsPath: p, scheme: 'file' }),
  },
}));

vi.mock('../../../../utils/path', () => ({
  getRelativePath: vi.fn((root, target) => target.replace(root + '/', '')),
}));

describe('VSCodeSearchRepository (Search Logic Verification)', () => {
  const mockRoot = '/mock/root';
  let repository: VSCodeSearchRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new VSCodeSearchRepository(mockRoot);
    (vscode.workspace.getConfiguration as any).mockReturnValue({
      get: vi.fn((key: string, def: any) => def),
    });
  });

  it('優先経路: findTextInFiles がヒットしたファイルを返すこと', async () => {
    (vscode.workspace as any).findTextInFiles = vi.fn().mockImplementation(
      (query, options, callback) => {
        callback({ uri: vscode.Uri.file(`${mockRoot}/src/api.ts`) });
        return Promise.resolve();
      }
    );
    const results = await repository.search('keyword');
    expect(results).toContain('src/api.ts');
  });

  it('ローカル検索フォールバック: ファイル内容にキーワードが含まれるか実際に判定すること', async () => {
    // VSCodeエンジンを無効化
    (vscode.workspace as any).findTextInFiles = undefined;
    (vscode.commands.executeCommand as any).mockRejectedValue(new Error('Engine Error'));

    // 2つのファイルを擬似的に用意
    const hitFile = vscode.Uri.file(`${mockRoot}/hit.ts`);
    const missFile = vscode.Uri.file(`${mockRoot}/miss.ts`);
    (vscode.workspace.findFiles as any).mockResolvedValue([hitFile, missFile]);

    // 内容をモック
    (vscode.workspace.fs.readFile as any).mockImplementation((uri: any) => {
      const content = uri.fsPath.includes('hit.ts') ? 'target keyword exists' : 'nothing here';
      return Promise.resolve(new TextEncoder().encode(content));
    });

    const results = await repository.search('keyword');

    expect(results).toContain('hit.ts');
    expect(results).not.toContain('miss.ts');
    expect(results).toHaveLength(1);
  });
});
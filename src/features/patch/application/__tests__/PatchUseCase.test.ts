// src/features/patch/application/__tests__/PatchUseCase.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PatchUseCase } from '../PatchUseCase';
import { ok } from '../../../../shared/domain/Result';
import * as vscode from 'vscode';

// VS Code API のモック
vi.mock('vscode', () => ({
  Uri: { file: (p: string) => ({ fsPath: p, path: p, query: '' }), parse: (p: string) => ({ path: p, query: '' }) },
  commands: { executeCommand: vi.fn() },
  window: { showErrorMessage: vi.fn(), showWarningMessage: vi.fn(), showInformationMessage: vi.fn(), openTextDocument: vi.fn(), showTextDocument: vi.fn() },
  workspace: { workspaceFolders: [{ uri: { fsPath: '/root' } }], openTextDocument: vi.fn() },
  env: { clipboard: { writeText: vi.fn() } }
}));

describe('PatchUseCase', () => {
  let useCase: PatchUseCase;
  const mockClipboard = { readText: vi.fn() };
  const mockFS = { readFile: vi.fn(), writeFile: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new PatchUseCase(mockClipboard as any, mockFS as any);
  });

  it('パッチが見つからない場合にエラーを表示すること', async () => {
    mockClipboard.readText.mockResolvedValue(ok('no patch here'));
    const result = await useCase.previewPatch('/root');
    expect(result.isFailure).toBe(true);
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('No patch found.');
  });

  it('正常なパッチでDiffエディタを開くこと', async () => {
    const patchMd = 'src/test.ts:\n```ts\n// ... existing code ...\nnew code\n```';
    mockClipboard.readText.mockResolvedValue(ok(patchMd));
    mockFS.readFile.mockResolvedValue(ok('old code'));

    await useCase.previewPatch('/root');
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('vscode.diff', expect.anything(), expect.anything(), expect.anything(), expect.anything());
  });

  it('変更率が高い場合に警告プロンプトを生成すること', async () => {
    // 10行のコードに対して、9行が削除されるような全体置き換えのパッチ（90%削除）をシミュレート
    const original = '1\n2\n3\n4\n5\n6\n7\n8\n9\n10';
    const patchMd = 'src/test.ts:\n```ts\nonly one line\n```';
    
    mockClipboard.readText.mockResolvedValue(ok(patchMd));
    mockFS.readFile.mockResolvedValue(ok(original));

    await useCase.previewPatch('/root');

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(expect.stringContaining('重大な変更'));
    expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('パッチ適用結果を検証してください'));
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { OutputCommands } from '../OutputCommands';

vi.mock('vscode', () => ({
  window: {
    withProgress: vi.fn((options, task) => task({ report: vi.fn() })),
    showTextDocument: vi.fn(),
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showErrorMessage: vi.fn(),
  },
  workspace: {
    fs: {
      stat: vi.fn(),
      readFile: vi.fn(),
    },
    getConfiguration: vi.fn(),
    openTextDocument: vi.fn().mockResolvedValue({}),
  },
  env: {
    clipboard: { writeText: vi.fn() },
  },
  Uri: {
    file: vi.fn((p) => ({ fsPath: p, scheme: 'file' })),
  },
  FileType: { Unknown: 0, File: 1, Directory: 2 },
  ProgressLocation: { Notification: 15 },
  ViewColumn: { One: 1, Beside: 2 }
}));

describe('OutputCommands (Complete Coverage)', () => {
  let outputCommands: OutputCommands;
  let mockSelectionUseCase: any;
  let mockPromptUseCase: any;
  let mockEngine: any;
  const mockRoot = '/mock/root';

  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectionUseCase = { currentSelection: { getPaths: vi.fn() } };
    mockPromptUseCase = { getSelectedPrompt: vi.fn(), getPromptContent: vi.fn() };
    mockEngine = { generate: vi.fn() };
    outputCommands = new OutputCommands(mockSelectionUseCase, mockPromptUseCase, mockEngine, mockRoot);

    (vscode.workspace.getConfiguration as any).mockReturnValue({
      get: vi.fn((key, def) => {
        const config: any = { openAfterGenerate: true, outputFilePath: 'out.txt' };
        return config[key] !== undefined ? config[key] : def;
      })
    });
  });

  it('エッジケース: 選択パスが空の場合は generate を実行しないこと', async () => {
    mockSelectionUseCase.currentSelection.getPaths.mockReturnValue([]);
    await outputCommands.generate();
    expect(vscode.window.withProgress).not.toHaveBeenCalled();
  });

  it('正常系: ファイルを読み込み、結果をクリップボードとUntitledエディタに出力する', async () => {
    mockSelectionUseCase.currentSelection.getPaths.mockReturnValue(['file.ts']);
    (vscode.workspace.fs.stat as any).mockResolvedValue({ type: vscode.FileType.File });
    (vscode.workspace.fs.readFile as any).mockResolvedValue(new TextEncoder().encode('content'));
    mockEngine.generate.mockReturnValue({ content: 'generated' });

    await outputCommands.generate();

    expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith('generated');
    expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'generated' })
    );
  });

  it('エッジケース: ファイルパスに絵文字や特殊記号が含まれていても処理できること', async () => {
    const specialPath = '📁folder/📝file.txt';
    mockSelectionUseCase.currentSelection.getPaths.mockReturnValue([specialPath]);
    (vscode.workspace.fs.stat as any).mockResolvedValue({ type: vscode.FileType.File });
    (vscode.workspace.fs.readFile as any).mockResolvedValue(new TextEncoder().encode('content'));
    mockEngine.generate.mockReturnValue({ content: 'res' });

    await outputCommands.generate();

    // 修正: 引数を直接検証する堅牢な方法に変更
    const calls = mockEngine.generate.mock.calls;
    expect(calls[0][0][0].path).toBe(specialPath);
    expect(calls[0][0][0].content).toBe('content');
  });

  it('境界条件: 一部のファイルの読み込みに失敗しても、他のファイルで処理を完遂すること', async () => {
    mockSelectionUseCase.currentSelection.getPaths.mockReturnValue(['fail.ts', 'ok.ts']);
    (vscode.workspace.fs.stat as any).mockResolvedValue({ type: vscode.FileType.File });
    (vscode.workspace.fs.readFile as any)
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(new TextEncoder().encode('ok-content'));
    mockEngine.generate.mockReturnValue({ content: 'res' });

    await outputCommands.generate();

    const filesSentToEngine = mockEngine.generate.mock.calls[0][0];
    expect(filesSentToEngine).toHaveLength(1);
    expect(filesSentToEngine[0].path).toBe('ok.ts');
  });

  it('異常系: readFile が EISDIR (ディレクトリ) エラーを投げた場合、スキップすること', async () => {
    mockSelectionUseCase.currentSelection.getPaths.mockReturnValue(['dir-path']);
    (vscode.workspace.fs.stat as any).mockResolvedValue({ type: vscode.FileType.File });
    const err = new Error('EISDIR');
    (err as any).code = 'FileIsADirectory';
    (vscode.workspace.fs.readFile as any).mockRejectedValue(err);

    await outputCommands.generate();
    expect(mockEngine.generate).not.toHaveBeenCalled();
  });

  it('設定: openAfterGenerate が false の場合、エディタを開かないこと', async () => {
    (vscode.workspace.getConfiguration as any).mockReturnValue({
      get: vi.fn((key, def) => (key === 'openAfterGenerate' ? false : def))
    });
    mockSelectionUseCase.currentSelection.getPaths.mockReturnValue(['a.ts']);
    (vscode.workspace.fs.stat as any).mockResolvedValue({ type: vscode.FileType.File });
    (vscode.workspace.fs.readFile as any).mockResolvedValue(new TextEncoder().encode('c'));
    mockEngine.generate.mockReturnValue({ content: 'res' });

    await outputCommands.generate();

    expect(vscode.env.clipboard.writeText).toHaveBeenCalled();
    expect(vscode.workspace.openTextDocument).not.toHaveBeenCalled();
  });

  it('正常系: JSONフォーマット時に言語設定が正しく渡されること', async () => {
    (vscode.workspace.getConfiguration as any).mockReturnValue({
      get: vi.fn((key, def) => (key === 'outputFormat' ? 'json' : (key === 'openAfterGenerate' ? true : def)))
    });
    mockSelectionUseCase.currentSelection.getPaths.mockReturnValue(['a.ts']);
    (vscode.workspace.fs.stat as any).mockResolvedValue({ type: vscode.FileType.File });
    (vscode.workspace.fs.readFile as any).mockResolvedValue(new TextEncoder().encode('{}'));
    mockEngine.generate.mockReturnValue({ content: '{}' });

    await outputCommands.generate();

    expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(
      expect.objectContaining({ language: 'json' })
    );
  });
});
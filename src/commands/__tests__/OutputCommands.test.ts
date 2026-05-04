import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { OutputCommands } from '../OutputCommands';
import { ok } from '../../shared/domain/Result';

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
    openTextDocument: vi.fn(),
  },
  languages: {
    setTextDocumentLanguage: vi.fn(),
  },
  env: {
    clipboard: { writeText: vi.fn() },
    language: 'en',
  },
  Uri: {
    file: vi.fn((p) => ({ fsPath: p, scheme: 'file', path: p })),
    parse: vi.fn((p) => ({ path: p, scheme: 'untitled' })),
  },
  Range: vi.fn(),
  Position: vi.fn(),
  FileType: { Unknown: 0, File: 1, Directory: 2 },
  ProgressLocation: { Notification: 15 },
  ViewColumn: { One: 1, Beside: 2 }
}));

describe('OutputCommands (Tab Reuse Integration)', () => {
  let outputCommands: OutputCommands;
  let mockSelectionUseCase: any;
  let mockPromptUseCase: any;
  let mockEngine: any;
  let mockFileSystem: any;
  const mockRoot = '/mock/root';

  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectionUseCase = { currentSelection: { getPaths: vi.fn() } };
    mockPromptUseCase = { getSelectedPrompt: vi.fn(), getPromptContent: vi.fn() };
    mockEngine = { generate: vi.fn() };
    mockFileSystem = { 
      readFile: vi.fn().mockResolvedValue(ok('c')),
      getFileSize: vi.fn().mockResolvedValue(ok(100))
    };

    
    outputCommands = new OutputCommands({
        selectionUseCase: mockSelectionUseCase,
        promptUseCase: mockPromptUseCase,
        engine: mockEngine,
        fileSystem: mockFileSystem,
        root: mockRoot
    });

    (vscode.workspace.getConfiguration as any).mockReturnValue({
      get: vi.fn((key, def) => (key === 'openAfterGenerate' ? true : def))
    });
  });

  it('タブ再利用: 既存のタブがある場合、edit メソッドで内容を更新すること', async () => {
    const mockDoc = {
      positionAt: vi.fn().mockReturnValue({}),
      getText: vi.fn().mockReturnValue('old'),
    };
    const mockEditor = { edit: vi.fn().mockImplementation((cb) => {
      cb.replace({}, 'new-content');
      return Promise.resolve(true);
    })};

    (vscode.workspace.openTextDocument as any).mockResolvedValue(mockDoc);
    (vscode.window.showTextDocument as any).mockResolvedValue(mockEditor);

    mockSelectionUseCase.currentSelection.getPaths.mockReturnValue(['a.ts']);
    mockEngine.generate.mockReturnValue({ content: 'new-content', format: 'markdown' });

    await outputCommands.generate();

    expect(vscode.Uri.parse).toHaveBeenCalled();
    expect(mockEditor.edit).toHaveBeenCalled();
  });

  it('初回作成: 既存タブがない場合、新しいドキュメントを開くこと', async () => {
    (vscode.workspace.openTextDocument as any)
      .mockRejectedValueOnce(new Error('Not found'))
      .mockResolvedValueOnce({});

    mockSelectionUseCase.currentSelection.getPaths.mockReturnValue(['a.ts']);
    mockEngine.generate.mockReturnValue({ content: 'res', format: 'markdown' });

    await outputCommands.generate();

    expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'res' })
    );
  });

  it('巨大ファイル・ガード: 閾値を超えたファイルの内容が省略されること', async () => {
    mockSelectionUseCase.currentSelection.getPaths.mockReturnValue(['large.ts']);
    mockFileSystem.getFileSize = vi.fn().mockResolvedValue(ok(1024 * 1024)); // 1MB
    mockFileSystem.readFile = vi.fn(); // 呼ばれないはず

    (vscode.workspace.getConfiguration as any).mockReturnValue({
      get: vi.fn((key, def) => (key === 'maxFileSizeKB' ? 500 : def))
    });

    mockEngine.generate.mockReturnValue({ content: '[File content omitted: Size exceeds 500KB limit]', format: 'markdown' });

    // 内部でのファイル読み込みを待機するために execute される処理を追跡

    await (outputCommands as any).runGeneration(['large.ts']);

    const callArgs = mockEngine.generate.mock.calls[0][0];
    expect(callArgs[0].content).toContain('omitted');
    expect(mockFileSystem.readFile).not.toHaveBeenCalled();
  });
});
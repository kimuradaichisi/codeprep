/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { OutputCommands } from '../OutputCommands';
import { ok } from '../../shared/domain/Result';

vi.mock('vscode', () => ({
  window: {
    withProgress: vi.fn((o, task) => task({ report: vi.fn() })),
    showTextDocument: vi.fn(),
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    visibleTextEditors: []
  },
  workspace: {
    fs: { stat: vi.fn(), readFile: vi.fn() },
    getConfiguration: vi.fn(),
    openTextDocument: vi.fn(),
  },
  languages: {
    setTextDocumentLanguage: vi.fn(),
    getDiagnostics: vi.fn().mockReturnValue([]),
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

describe('OutputCommands (Context Intelligence & Tab Reuse)', () => {
  let outputCommands: OutputCommands;
  let mockSelectionUseCase: any;
  let mockPromptUseCase: any;
  let mockEngine: any;
  let mockFileSystem: any;

  beforeEach(() => {
    vi.clearAllMocks();
    (OutputCommands as any).lastState.clear();
    mockSelectionUseCase = { currentSelection: { getPaths: vi.fn() } };
    mockPromptUseCase = { getSelectedPrompt: vi.fn(), getPromptContent: vi.fn() };
    mockEngine = { generate: vi.fn() };
    mockFileSystem = { 
      readFile: vi.fn().mockResolvedValue(ok('content')),
      getFileSize: vi.fn().mockResolvedValue(ok(100))
    };

    outputCommands = new OutputCommands({
        selectionUseCase: mockSelectionUseCase,
        promptUseCase: mockPromptUseCase,
        engine: mockEngine,
        fileSystem: mockFileSystem,
        root: '/root'
    });

    (vscode.workspace.getConfiguration as any).mockReturnValue({
      get: vi.fn((key, def) => (key === 'openAfterGenerate' ? true : def))
    });
  });

  it('タブ再利用: 既存のタブがある場合、edit メソッドで内容を更新すること', async () => {
    const mockDoc = { 
      positionAt: vi.fn().mockReturnValue({}), 
      getText: vi.fn().mockReturnValue('old'),
      lineCount: 1,  // 少なくとも1行必要
      lineAt: vi.fn().mockReturnValue({ text: 'old' }),
      isClosed: false
    };
    
    const mockEditor = { 
      edit: vi.fn().mockResolvedValue(true), // シンプルに
      document: mockDoc
    };
    
    // visibleTextEditors を設定
    (vscode.window.visibleTextEditors as any) = [mockEditor];

    mockSelectionUseCase.currentSelection.getPaths.mockReturnValue(['a.ts']);
    mockEngine.generate.mockReturnValue({ content: 'res' });

    // 1回目の実行で lastOutputDoc を設定
    await outputCommands.generate();
    
    // lastOutputDoc をモックドキュメントに設定
    (OutputCommands as any).lastOutputDoc = mockDoc;

    // 2回目の実行で edit が呼ばれるはず
    await outputCommands.generate();
    
    expect(mockEditor.edit).toHaveBeenCalled();
  });

  it('巨大ファイル・ガード: 閾値を超えたファイルの内容が制限されること', async () => {
    mockSelectionUseCase.currentSelection.getPaths.mockReturnValue(['large.ts']);
    mockFileSystem.readFile.mockResolvedValue(ok('a'.repeat(1000)));
    (vscode.workspace.getConfiguration as any).mockReturnValue({
      get: vi.fn((k, d) => k === 'maxFileSizeKB' ? 0.5 : d)
    });
    mockEngine.generate.mockReturnValue({ content: 'omitted' });

    await (outputCommands as any).runGeneration(['large.ts']);
    expect(mockEngine.generate).toHaveBeenCalledWith(
        expect.anything(), 
        expect.objectContaining({ maxFileSizeKB: 0.5 }), 
        undefined
    );
  });

  it('Feature 2: エラー情報が存在する場合、コンテンツに付与されること', async () => {
    const mockUri = { fsPath: '/root/test.ts' };
    (vscode.languages.getDiagnostics as any).mockReturnValue([[mockUri, [{ message: 'Err', range: { start: { line: 0 } } }]]]);
    (vscode.workspace.getConfiguration as any).mockReturnValue({
      get: vi.fn((k, d) => k === 'includeErrors' ? true : d)
    });

    mockSelectionUseCase.currentSelection.getPaths.mockReturnValue(['test.ts']);
    mockEngine.generate.mockReturnValue({ content: 'body' });

    await outputCommands.generate();
    expect(vi.mocked(vscode.env.clipboard.writeText)).toHaveBeenCalledWith(expect.stringContaining('## Related Errors'));
  });

  it('Feature 5: 依存関係（import）の自動抽出と追加が行われること', async () => {
    mockFileSystem.readFile.mockResolvedValueOnce(ok('import "./dep"'));
    mockFileSystem.readFile.mockResolvedValueOnce(ok('dep content'));
    (vscode.workspace.getConfiguration as any).mockReturnValue({
      get: vi.fn((k, d) => k === 'includeDependencies' ? true : d)
    });

    mockSelectionUseCase.currentSelection.getPaths.mockReturnValue(['test.ts']);
    mockEngine.generate.mockReturnValue({ content: 'res' });

    await outputCommands.generate();
    const files = mockEngine.generate.mock.calls[0][0];
    expect(files.length).toBe(2);
    expect(files[1].path).toContain('dep');
  });

  it('Feature 7: Incremental Mode で変更のないファイルがフィルタリングされること', async () => {
    (vscode.workspace.getConfiguration as any).mockReturnValue({
      get: vi.fn((k, d) => k === 'incrementalMode' ? true : d)
    });
    mockSelectionUseCase.currentSelection.getPaths.mockReturnValue(['a.ts']);
    mockFileSystem.readFile.mockResolvedValue(ok('same'));
    mockEngine.generate.mockReturnValue({ content: 'res' });

    await outputCommands.generate(); // 1回目
    expect(mockEngine.generate.mock.calls[0][0].length).toBe(1);

    await outputCommands.generate(); // 2回目
    expect(mockEngine.generate.mock.calls[1]).toBeUndefined(); // ファイルが0件なので generate が呼ばれない
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { OutputCommands } from '../OutputCommands';

// vscode モジュールのモックを完全に定義
vi.mock('vscode', () => ({
  window: {
    withProgress: vi.fn((options, task) => task({ report: vi.fn() })),
    showTextDocument: vi.fn(),
    showInformationMessage: vi.fn(), // 追加
    showWarningMessage: vi.fn(),     // 追加
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
    clipboard: {
      writeText: vi.fn(),
    },
  },
  Uri: {
    file: vi.fn((p) => ({ fsPath: p, scheme: 'file' })),
  },
  FileType: {
    Unknown: 0,
    File: 1,
    Directory: 2,
    SymbolicLink: 64,
  },
  ProgressLocation: {
    Notification: 15,
  },
}));


describe('OutputCommands', () => {
  let outputCommands: OutputCommands;
  let mockSelectionUseCase: any;
  let mockPromptUseCase: any;
  let mockEngine: any;
  const mockRoot = '/mock/root';

  beforeEach(() => {
    vi.clearAllMocks();

    // 依存関係のモック
    mockSelectionUseCase = {
      currentSelection: {
        getPaths: vi.fn(),
      },
    };

    mockPromptUseCase = {
      getSelectedPrompt: vi.fn(),
      getPromptContent: vi.fn(),
    };

    mockEngine = {
      generate: vi.fn(),
    };

    outputCommands = new OutputCommands(
      mockSelectionUseCase,
      mockPromptUseCase,
      mockEngine,
      mockRoot
    );

    // VS Code 設定のデフォルト値
    (vscode.workspace.getConfiguration as any).mockReturnValue({
      get: vi.fn((key) => {
        const config: Record<string, any> = {
          outputFormat: 'markdown',
          outputMode: 'everything',
          includeMetadata: true,
          removeComments: false,
          includeEmptyLines: true,
        };
        return config[key];
      }),
    });
  });

  it('選択されたパスがない場合は generate を実行しない', async () => {
    mockSelectionUseCase.currentSelection.getPaths.mockReturnValue([]);

    await outputCommands.generate();

    expect(vscode.window.withProgress).not.toHaveBeenCalled();
  });

  it('正常系: ファイルを読み込み、結果をクリップボードとエディタに出力する', async () => {
    const testPath = 'file.ts';
    const testContent = 'console.log("hello");'; // 期待する文字列
    mockSelectionUseCase.currentSelection.getPaths.mockReturnValue([testPath]);

    (vscode.workspace.fs.stat as any).mockResolvedValue({ type: vscode.FileType.File });
    
    // 【修正箇所】 Uint8Array として値を返す
    (vscode.workspace.fs.readFile as any).mockResolvedValue(
      new Uint8Array(Buffer.from(testContent))
    );
    
    mockPromptUseCase.getSelectedPrompt.mockReturnValue('p1');
    mockPromptUseCase.getPromptContent.mockResolvedValue('system-prompt');
    
    const mockOutput = 'Generated Markdown';
    mockEngine.generate.mockReturnValue({ content: mockOutput });

    await outputCommands.generate();

    expect(mockEngine.generate).toHaveBeenCalledWith(
      [{ path: testPath, content: testContent }], // ここで文字列として比較される
      expect.anything(),
      'system-prompt'
    );
  });

  it('一部のファイルでエラーが発生しても正常なファイルのみで処理を完遂する', async () => {
    mockSelectionUseCase.currentSelection.getPaths.mockReturnValue(['fail.ts', 'ok.ts']);
    (vscode.workspace.fs.stat as any).mockResolvedValue({ type: vscode.FileType.File });
    
    (vscode.workspace.fs.readFile as any)
      .mockRejectedValueOnce(new Error('Read Error'))
      .mockResolvedValueOnce(new Uint8Array(Buffer.from('ok content'))); // ここも Uint8Array

    mockEngine.generate.mockReturnValue({ content: 'res' });

    await outputCommands.generate();

    const files = mockEngine.generate.mock.calls[0][0];
    expect(files[0].content).toBe('ok content'); // 正しくデコードされていればパスする
  });

  it('ディレクトリが渡された場合は stat チェックでスキップする', async () => {
    mockSelectionUseCase.currentSelection.getPaths.mockReturnValue(['my-dir']);
    
    // stat でディレクトリと判定
    (vscode.workspace.fs.stat as any).mockResolvedValue({ type: vscode.FileType.Directory });

    await outputCommands.generate();

    expect(vscode.workspace.fs.readFile).not.toHaveBeenCalled();
    expect(mockEngine.generate).not.toHaveBeenCalled();
  });

  it('readFile がディレクトリ起因のエラーを投げた場合に適切にスキップする', async () => {
    mockSelectionUseCase.currentSelection.getPaths.mockReturnValue(['problematic-path']);
    
    (vscode.workspace.fs.stat as any).mockResolvedValue({ type: vscode.FileType.File });
    
    // EISDIR エラーの模倣
    const dirError = new Error('EISDIR: read error');
    (dirError as any).code = 'FileIsADirectory';
    (vscode.workspace.fs.readFile as any).mockRejectedValue(dirError);

    await outputCommands.generate();

    // 有効なファイルがないためエンジンは呼ばれない
    expect(mockEngine.generate).not.toHaveBeenCalled();
  });

  it('一部のファイルでエラーが発生しても正常なファイルのみで処理を完遂する', async () => {
    mockSelectionUseCase.currentSelection.getPaths.mockReturnValue(['fail.ts', 'ok.ts']);
    
    (vscode.workspace.fs.stat as any).mockResolvedValue({ type: vscode.FileType.File });
    
    (vscode.workspace.fs.readFile as any)
      .mockRejectedValueOnce(new Error('Unknown read error')) // 1つ目は失敗
      .mockResolvedValueOnce(new TextEncoder().encode('ok content')); // 2つ目は成功

    mockPromptUseCase.getSelectedPrompt.mockReturnValue('p');
    mockPromptUseCase.getPromptContent.mockResolvedValue('prompt');
    mockEngine.generate.mockReturnValue({ content: 'result' });

    await outputCommands.generate();

    // エンジンには ok.ts だけが渡される
    const files = mockEngine.generate.mock.calls[0][0];
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('ok.ts');
    expect(files[0].content).toBe('ok content');
  });

it('ディレクトリが渡された場合は、何も生成せずクリップボードも操作しない', async () => {
    // セットアップ: フォルダパスを1つ返す
    mockSelectionUseCase.currentSelection.getPaths.mockReturnValue(['my-dir']);
    (vscode.workspace.fs.stat as any).mockResolvedValue({ type: vscode.FileType.Directory });

    await outputCommands.generate();

    // 検証: エンジンが呼ばれていないこと
    expect(mockEngine.generate).not.toHaveBeenCalled();
    
    // 検証: クリップボードに何も書かれていないこと
    expect(vscode.env.clipboard.writeText).not.toHaveBeenCalled();
    
    // 検証: エディタも開かれていないこと
    expect(vscode.window.showTextDocument).not.toHaveBeenCalled();
  });

  it('readFileがエラー(EISDIR)を投げた場合も、何も生成せず終了する', async () => {
    mockSelectionUseCase.currentSelection.getPaths.mockReturnValue(['some-path']);
    (vscode.workspace.fs.stat as any).mockResolvedValue({ type: vscode.FileType.File });
    
    const dirError = new Error('EISDIR');
    (dirError as any).code = 'FileIsADirectory';
    (vscode.workspace.fs.readFile as any).mockRejectedValue(dirError);

    await outputCommands.generate();

    expect(mockEngine.generate).not.toHaveBeenCalled();
    expect(vscode.env.clipboard.writeText).not.toHaveBeenCalled();
  });

});
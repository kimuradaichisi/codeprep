import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { registerAllCommands } from '../CommandRegistry';
import { GitUtils } from '../../utils/git';

// モック定義
vi.mock('../../utils/git', () => ({
  GitUtils: { getDiff: vi.fn() }
}));

vi.mock('vscode', () => {
  return {
    commands: { registerCommand: vi.fn(), executeCommand: vi.fn() },
    window: { 
      showQuickPick: vi.fn(),
      showInputBox: vi.fn(),
      withProgress: vi.fn((_, task) => task({ report: vi.fn() })),
      showInformationMessage: vi.fn(),
      showWarningMessage: vi.fn(),
      showErrorMessage: vi.fn(),
      showTextDocument: vi.fn()
    },
    workspace: { 
      getConfiguration: vi.fn(() => ({ get: vi.fn((key, def) => def) })),
      fs: { 
        stat: vi.fn(), 
        readFile: vi.fn(), 
        writeFile: vi.fn().mockResolvedValue(undefined) 
      },
      openTextDocument: vi.fn().mockResolvedValue({ uri: { fsPath: 'test' } })
    },
    Uri: { 
      file: vi.fn(p => ({ fsPath: p, scheme: 'file' })), 
      parse: vi.fn(p => ({ fsPath: p, scheme: 'codeprep-preview' })) 
    },
    env: { clipboard: { writeText: vi.fn() } },
    FileType: { File: 1, Directory: 2, SymbolicLink: 64 },
    ProgressLocation: { Notification: 15 },
    ViewColumn: { Beside: -2 }
  };
});

describe('CommandRegistry Integration Tests', () => {
  let selectionUseCase: any, promptUseCase: any, uiController: any, engine: any, repo: any;
  const root = '/root';

  beforeEach(() => {
    vi.clearAllMocks();
    
    selectionUseCase = { 
      selectAll: vi.fn().mockResolvedValue(undefined),
      invertSelection: vi.fn().mockResolvedValue(undefined),
      savePreset: vi.fn(),
      loadPreset: vi.fn(),
      getPresetList: vi.fn().mockReturnValue(['preset1']),
      currentSelection: { 
        getPaths: vi.fn().mockReturnValue(['file1.ts']),
        clear: vi.fn()
      },
      selectModifiedFiles: vi.fn()
    };
    promptUseCase = {
      getSelectedPrompt: vi.fn().mockReturnValue('p1'),
      getPromptContent: vi.fn().mockReturnValue('prompt-content')
    };
    uiController = { refresh: vi.fn() };
    engine = { generate: vi.fn().mockReturnValue({ content: 'generated' }) };
    repo = {};

    registerAllCommands({} as any, selectionUseCase, promptUseCase, uiController, engine, repo, root);
  });

  const getHandler = (commandId: string) => {
    const call = (vscode.commands.registerCommand as any).mock.calls.find(
      (c: any) => c[0] === commandId
    );
    if (!call) throw new Error(`Command ${commandId} not registered`);
    return call[1];
  };

  describe('GitCommands (Integrated Menu)', () => {
    it('mod (修正ファイル) が選択された時に UseCase を呼ぶこと', async () => {
      (vscode.window.showQuickPick as any).mockResolvedValue({ id: 'mod' });
      await getHandler('codeprep.gitMenu')();
      expect(selectionUseCase.selectModifiedFiles).toHaveBeenCalledWith(expect.anything(), root, false);
    });

    it('commit が選択された時に diff をコピーすること', async () => {
      (vscode.window.showQuickPick as any).mockResolvedValue({ id: 'commit' });
      (GitUtils.getDiff as any).mockResolvedValue('diff-text');
      await getHandler('codeprep.gitMenu')();
      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('diff-text'));
    });
  });

  describe('OutputCommands (Generate)', () => {
    it('正常に生成・保存・ファイルオープンが行われること', async () => {
      (vscode.workspace.fs.stat as any).mockResolvedValue({ type: vscode.FileType.File }); 
      (vscode.workspace.fs.readFile as any).mockResolvedValue(Buffer.from('content'));

      await getHandler('codeprep.generate')();

      // 1. 生成の確認
      expect(engine.generate).toHaveBeenCalled();
      
      // 2. 保存の確認
      expect(vscode.workspace.fs.writeFile).toHaveBeenCalled();

      // 3. ★自動オープンの確認
      expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(
        expect.objectContaining({ fsPath: expect.stringContaining('codeprep-output.txt') })
      );
      expect(vscode.window.showTextDocument).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ preview: false })
      );
    });

    it('ディレクトリやシンボリックリンク(ディレクトリ)をスキップすること (EISDIR対策)', async () => {
      // 3つのパスを返すが、ファイルは1つだけ
      selectionUseCase.currentSelection.getPaths.mockReturnValue(['file1.ts', 'dir1', 'linkDir']);
      (vscode.workspace.fs.stat as any)
        .mockResolvedValueOnce({ type: vscode.FileType.File }) // 1 (Pass)
        .mockResolvedValueOnce({ type: vscode.FileType.Directory }) // 2 (Skip)
        .mockResolvedValueOnce({ type: vscode.FileType.SymbolicLink | vscode.FileType.Directory }); // 66 (Skip)

      (vscode.workspace.fs.readFile as any).mockResolvedValue(Buffer.from('content'));

      await getHandler('codeprep.generate')();

      // engine.generate に渡されたファイルリストの数が 1 であることを検証
      const calledFiles = engine.generate.mock.calls[0][0];
      expect(calledFiles).toHaveLength(1);
      expect(calledFiles[0].path).toBe('file1.ts');
    });
  });

  describe('Preset & Selection Commands', () => {
    it('loadPreset が正しく実行されること', async () => {
      (vscode.window.showQuickPick as any).mockResolvedValue('preset1');
      const handler = getHandler('codeprep.loadPreset');
      await handler();
      expect(selectionUseCase.loadPreset).toHaveBeenCalledWith('preset1');
      expect(uiController.refresh).toHaveBeenCalled();
    });

    it('savePreset が入力を求めて保存すること', async () => {
      (vscode.window.showInputBox as any).mockResolvedValue('new-p');
      await getHandler('codeprep.savePreset')();
      expect(selectionUseCase.savePreset).toHaveBeenCalledWith('new-p');
    });
  });
});
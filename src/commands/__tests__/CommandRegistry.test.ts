import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { registerAllCommands } from '../CommandRegistry';
import { GitUtils } from '../../utils/git';

vi.mock('../../utils/git', () => ({
  GitUtils: { getDiff: vi.fn(), getModifiedFiles: vi.fn() }
}));

vi.mock('vscode', () => ({
  commands: { registerCommand: vi.fn() },
  window: { 
    showQuickPick: vi.fn(),
    showInputBox: vi.fn(),
    withProgress: vi.fn((_, task) => task({ report: vi.fn() })),
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showTextDocument: vi.fn()
  },
  workspace: { 
    getConfiguration: vi.fn(() => ({ 
        get: vi.fn((key, def) => (key.includes('openAfter') ? true : def)) 
    })),
    fs: { stat: vi.fn(), readFile: vi.fn() },
    openTextDocument: vi.fn().mockResolvedValue({ uri: 'untitled' })
  },
  Uri: { file: vi.fn(p => ({ fsPath: p })), parse: vi.fn(p => ({ fsPath: p })) },
  env: { clipboard: { writeText: vi.fn() } },
  FileType: { File: 1, Directory: 2 },
  ProgressLocation: { Notification: 15 },
  ViewColumn: { One: 1, Beside: 2 }
}));

describe('CommandRegistry Integration Tests', () => {
  let selectionUseCase: any, promptUseCase: any, uiController: any, engine: any;

  beforeEach(() => {
    vi.clearAllMocks();
    selectionUseCase = { 
      currentSelection: { getPaths: vi.fn().mockReturnValue(['file.ts']), clear: vi.fn() },
      selectModifiedFiles: vi.fn(),
      selectAll: vi.fn(),
      invertSelection: vi.fn(),
      savePreset: vi.fn(),
      loadPreset: vi.fn(),
      getPresetList: vi.fn().mockReturnValue(['p1'])
    };
    promptUseCase = { getSelectedPrompt: vi.fn(), getPromptContent: vi.fn() };
    uiController = { refresh: vi.fn() };
    engine = { generate: vi.fn().mockReturnValue({ content: 'res' }) };

    registerAllCommands({} as any, selectionUseCase, promptUseCase, uiController, engine, {} as any, '/root');
  });

  const getHandler = (id: string) => {
    const call = (vscode.commands.registerCommand as any).mock.calls.find((c: any) => c[0] === id);
    return call[1];
  };

  it('Gitアクション: commitプロンプトがUntitledエディタで開かれること', async () => {
    (vscode.window.showQuickPick as any).mockResolvedValue({ id: 'commit', label: 'Commit' });
    (GitUtils.getDiff as any).mockResolvedValue('diff-content');

    await getHandler('codeprep.gitMenu')();

    expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(
        expect.objectContaining({ content: expect.stringContaining('diff-content'), language: 'markdown' })
    );
    expect(vscode.window.showTextDocument).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ viewColumn: vscode.ViewColumn.Beside })
    );
  });

  it('プリセット管理: loadPresetが正しく連動すること', async () => {
    (vscode.window.showQuickPick as any).mockResolvedValue('p1');
    await getHandler('codeprep.loadPreset')();
    expect(selectionUseCase.loadPreset).toHaveBeenCalledWith('p1');
    expect(uiController.refresh).toHaveBeenCalled();
  });

  it('セレクション: selectAllが全選択を実行すること', async () => {
    await getHandler('codeprep.selectAll')();
    expect(selectionUseCase.selectAll).toHaveBeenCalled();
    expect(uiController.refresh).toHaveBeenCalled();
  });
});
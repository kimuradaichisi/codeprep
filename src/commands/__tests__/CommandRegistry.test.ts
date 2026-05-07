/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { registerAllCommands } from '../CommandRegistry';
import { ok } from '../../shared/domain/Result';

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
        get: vi.fn((key, def) => (key.includes('openAfter') ? true : def)),
        update: vi.fn().mockResolvedValue(undefined)
    })),
    fs: { stat: vi.fn(), readFile: vi.fn() },
    openTextDocument: vi.fn().mockResolvedValue({ uri: 'untitled' })
  },
  Uri: { file: vi.fn(p => ({ fsPath: p, path: p })), parse: vi.fn(p => ({ fsPath: p, path: p })) },
  env: { clipboard: { writeText: vi.fn() } },
  FileType: { File: 1, Directory: 2 },
  ProgressLocation: { Notification: 15 },
  ViewColumn: { One: 1, Beside: 2 },
  Range: vi.fn(),
  Position: vi.fn()
}));

describe('CommandRegistry Integration Tests', () => {
  let selectionUseCase: any, promptUseCase: any, uiController: any, engine: any;
  let fileSystem: any, gitClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    selectionUseCase = { 
      currentSelection: { getPaths: vi.fn().mockReturnValue(['file.ts']), clear: vi.fn(), set: vi.fn() },
      selectModifiedFiles: vi.fn(), selectAll: vi.fn(), invertSelection: vi.fn(),
      savePreset: vi.fn(), loadPreset: vi.fn(), getPresetList: vi.fn().mockReturnValue(['p1'])
    };
    promptUseCase = { 
      getAvailablePrompts: vi.fn().mockResolvedValue({ 
        names: ['p1'], findByName: vi.fn().mockReturnValue({ summary: 'sum' }) 
      }),
      selectPrompt: vi.fn()
    };
    uiController = { refresh: vi.fn() };
    engine = { generate: vi.fn().mockReturnValue({ content: 'res' }) };
    fileSystem = {
        readFile: vi.fn().mockResolvedValue(ok('content')),
        readDirectory: vi.fn().mockResolvedValue(ok([])),
        exists: vi.fn().mockResolvedValue(true),
        getFileSize: vi.fn().mockResolvedValue(ok(100))
    };
    gitClient = { 
        getModifiedFiles: vi.fn().mockResolvedValue(ok(['mod.ts'])), 
        getDiff: vi.fn().mockResolvedValue(ok('diff')), 
        findRelatedTests: vi.fn().mockResolvedValue(ok([])) 
  };

    registerAllCommands({
      context: { subscriptions: [] } as any, selectionUseCase, promptUseCase, uiController,
      engine, workspaceRepo: {} as any, fileSystem, gitClient, patchUseCase: {} as any, root: '/root'
  });
  });

  const getHandler = (id: string) => {
    const call = (vscode.commands.registerCommand as any).mock.calls.find((c: any) => c[0] === id);
    return call[1];
  };

  it('Gitアクション: commitプロンプトが既存タブを再利用または新規作成されること', async () => {
    (vscode.window.showQuickPick as any).mockResolvedValue({ id: 'commit', label: 'Commit' });
    gitClient.getDiff.mockResolvedValue(ok('diff-content'));
    await getHandler('codeprep.gitMenu')();
    expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(expect.objectContaining({ path: expect.stringContaining('Commit Message.md') }));
    expect(vscode.window.showTextDocument).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ viewColumn: vscode.ViewColumn.Beside }));
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

  it('addToSelection: 右クリックからファイルを追加できること', async () => {
    const uri = { fsPath: '/root/src/app.ts' } as vscode.Uri;
    await getHandler('codeprep.addToSelection')(uri);
    expect(selectionUseCase.currentSelection.set).toHaveBeenCalledWith('src/app.ts', true);
    expect(uiController.refresh).toHaveBeenCalled();
  });

  it('すべてのコマンドがvscodeに登録されていること', () => {
    const registeredCommands = (vscode.commands.registerCommand as any).mock.calls.map((c: any) => c[0]);
    const expectedCommands = [
      'codeprep.selectionMenu', 'codeprep.presetMenu', 'codeprep.gitMenu', 'codeprep.refreshTree',
      'codeprep.generate', 'codeprep.openSettings', 'codeprep.selectPrompt', 'codeprep.addToSelection',
      'codeprep.selectAll', 'codeprep.clearAll', 'codeprep.invertSelection', 'codeprep.savePreset',
      'codeprep.loadPreset', 'codeprep.selectByGrep', 'codeprep.configureGenerationOptions'
    ];
    expectedCommands.forEach(cmd => expect(registeredCommands).toContain(cmd));
  });
});
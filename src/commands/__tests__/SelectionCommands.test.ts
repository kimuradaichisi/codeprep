/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { SelectionCommands } from '../SelectionCommands';

vi.mock('vscode', () => ({
  window: {
    showQuickPick: vi.fn(),
    showInputBox: vi.fn(),
    withProgress: vi.fn((_, task) => task()),
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    showWarningMessage: vi.fn()
  },
  env: { clipboard: { readText: vi.fn() } },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn((k, d) => d),
      update: vi.fn().mockResolvedValue(undefined)
    }))
  },
  ProgressLocation: { Notification: 15 },
  ConfigurationTarget: { Global: 1 }
}));

describe('SelectionCommands Integration Tests', () => {
  let commands: SelectionCommands;
  let mockDeps: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeps = {
      useCase: {
        currentSelection: { clear: vi.fn(), addAll: vi.fn(), getPaths: vi.fn() },
        selectAll: vi.fn(),
        getPresetList: vi.fn().mockReturnValue([])
      },
      ui: { refresh: vi.fn() },
      repo: {},
      searchRepo: {},
      gitClient: {},
      root: '/root'
    };
    commands = new SelectionCommands(mockDeps);
  });

  it('configureGenerationOptions: 選択したオプションが設定に保存されること', async () => {
    const mockConfig = {
      get: vi.fn().mockReturnValue(false),
      update: vi.fn().mockResolvedValue(undefined)
    };
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue([
      { id: 'skeletonMode', label: 'Skeleton' },
      { id: 'includeErrors', label: 'Errors' }
    ] as any);

    await commands.configureGenerationOptions();

    expect(mockConfig.update).toHaveBeenCalledWith('skeletonMode', true, 1);
    expect(mockConfig.update).toHaveBeenCalledWith('includeDependencies', false, 1);
    expect(mockConfig.update).toHaveBeenCalledWith('includeErrors', true, 1);
  });

  it('selectFromClipboard: クリップボードから選択後にUIをリフレッシュすること', async () => {
    vi.mocked(vscode.env.clipboard.readText).mockResolvedValue('src/test.ts');
    
    await commands.selectFromClipboard();

    // 親ディレクトリも含まれる
    expect(mockDeps.useCase.currentSelection.addAll).toHaveBeenCalledWith(['src/test.ts', 'src']);
    expect(mockDeps.ui.refresh).toHaveBeenCalled();
  });

  it('runSelectionAction: "clip" IDでクリップボード選択が実行されること', async () => {
    const spy = vi.spyOn(commands, 'selectFromClipboard').mockResolvedValue();
    
    await commands.runSelectionAction('clip');

    expect(spy).toHaveBeenCalled();
  });
});
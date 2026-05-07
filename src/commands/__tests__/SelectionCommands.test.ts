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
    showErrorMessage: vi.fn()
  },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn((k, d) => d),
      update: vi.fn().mockResolvedValue(undefined)
    }))
  },
  ProgressLocation: { Notification: 15 },
  ConfigurationTarget: { Global: 1 }
}));

describe('SelectionCommands - New Features', () => {
  let commands: SelectionCommands;
  let mockDeps: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeps = {
      useCase: { currentSelection: { clear: vi.fn() }, selectAll: vi.fn() },
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
    (vscode.workspace.getConfiguration as any).mockReturnValue(mockConfig);
    
    // Skeleton Mode と Include Errors を選択したと仮定
    (vscode.window.showQuickPick as any).mockResolvedValue([
      { id: 'skeletonMode', label: 'Skeleton' },
      { id: 'includeErrors', label: 'Errors' }
    ]);

    await commands.configureGenerationOptions();

    // 選択されたものは true, されていないものは false で更新されること
    expect(mockConfig.update).toHaveBeenCalledWith('skeletonMode', true, expect.anything());
    expect(mockConfig.update).toHaveBeenCalledWith('includeDependencies', false, expect.anything());
    expect(mockConfig.update).toHaveBeenCalledWith('includeErrors', true, expect.anything());
  });
});
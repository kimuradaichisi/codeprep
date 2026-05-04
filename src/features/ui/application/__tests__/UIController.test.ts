import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { UIController } from '../UIController';
import { ok } from '../../../../shared/domain/Result';

const mockConfig = {
  get: vi.fn((k, d) => d)
};

vi.mock('vscode', () => ({
  commands: { executeCommand: vi.fn() },
  workspace: { getConfiguration: vi.fn(() => mockConfig) }
}));


describe('UIController', () => {
  let controller: UIController;
  let deps: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    deps = {
      selection: { getPaths: vi.fn().mockReturnValue(['a.ts']) },
      tokenUseCase: { update: vi.fn(), resetBatch: vi.fn(), commitBatch: vi.fn(), addFileToBatch: vi.fn() },

      treeProvider: { refresh: vi.fn() },
      fileSystem: { 
        readFile: vi.fn().mockResolvedValue(ok('content')),
        getFileSize: vi.fn().mockResolvedValue(ok(100))
      },

      root: '/root',
      gitWatcher: { updateCache: vi.fn() }
    };
    controller = new UIController(deps);
  });

  it('refresh: should debounce token update', async () => {
    await controller.refresh();
    expect(deps.treeProvider.refresh).toHaveBeenCalled();
    expect(deps.tokenUseCase.commitBatch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(800);
    // Promise の解決を待機
    await vi.runAllTimersAsync();
    
    expect(deps.tokenUseCase.commitBatch).toHaveBeenCalledWith(expect.any(Number));

  });


  it('refresh: should update context for selection empty state', async () => {
    deps.selection.getPaths.mockReturnValue([]);
    await controller.refresh();
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('setContext', 'codeprep.selectionEmpty', true);
  });

  it('updateButtonContexts: should set contexts for all buttons', async () => {
    mockConfig.get.mockReturnValue(['codeprep.generate']);
    
    await controller.updateButtonContexts();
    
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('setContext', 'codeprep.showGenerate', true);
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('setContext', 'codeprep.showSelectAll', false);
  });

});


import * as vscode from 'vscode';
import * as path from 'path';
import { SelectionUseCase } from '../features/selection/application/SelectionUseCase';
import { PromptUseCase } from '../features/prompt/application/PromptUseCase';
import { OutputEngine } from '../features/engine/domain/OutputEngine';
import { UIController } from '../features/ui/application/UIController';
import { VSCodeWorkspaceRepository } from '../features/selection/infrastructure/VSCodeWorkspaceRepository';
import { VSCodeSearchRepository } from '../features/selection/infrastructure/VSCodeSearchRepository';
import { GitCommands } from './GitCommands';
import { OutputCommands } from './OutputCommands';
import { SelectionCommands } from './SelectionCommands';

export function registerAllCommands(
  context: vscode.ExtensionContext,
  selectionUseCase: SelectionUseCase,
  promptUseCase: PromptUseCase,
  uiController: UIController,
  engine: OutputEngine,
  workspaceRepo: VSCodeWorkspaceRepository,
  root: string | undefined
): vscode.Disposable[] {
  const searchRepo = new VSCodeSearchRepository(root || '');
  const gitCmd = new GitCommands(selectionUseCase, uiController, root);
  const outCmd = new OutputCommands(selectionUseCase, promptUseCase, engine, root);
  const selCmd = new SelectionCommands(selectionUseCase, uiController, workspaceRepo, searchRepo, root);

  return [
    // 1. 統合メニューコマンド
    vscode.commands.registerCommand('codeprep.selectionMenu', () => selCmd.showSelectionMenu()),
    vscode.commands.registerCommand('codeprep.presetMenu', () => selCmd.showPresetMenu()),
    vscode.commands.registerCommand('codeprep.gitMenu', () => gitCmd.showMenu()),

    // 2. 基幹アクション
    vscode.commands.registerCommand('codeprep.refreshTree', () => uiController.refresh()),
    vscode.commands.registerCommand('codeprep.generate', () => outCmd.generate()),
    vscode.commands.registerCommand('codeprep.openSettings', () => 
      vscode.commands.executeCommand('workbench.action.openSettings', '@ext:codeprep')),

    // 3. 【復活】プロンプト選択
    vscode.commands.registerCommand('codeprep.selectPrompt', async () => {
      const prompts = await promptUseCase.getAvailablePrompts();
      const items = prompts.names.map(name => ({ label: name, description: prompts.findByName(name)?.summary }));
      const selected = await vscode.window.showQuickPick(items, { placeHolder: '挿入するプロンプトを選択' });
      if (selected) promptUseCase.selectPrompt(selected.label);
    }),

    // 4. 【復活】エクスプローラーからの右クリック追加
    vscode.commands.registerCommand('codeprep.addToSelection', async (uri: vscode.Uri) => {
      if (uri && root) {
        const relPath = path.relative(root, uri.fsPath).replace(/\\/g, '/');
        selectionUseCase.currentSelection.set(relPath, true);
        await uiController.refresh();
      }
    }),

    // 5. 個別コマンド (パレット/ショートカット用)
    vscode.commands.registerCommand('codeprep.selectAll', () => selCmd.selectAll()),
    vscode.commands.registerCommand('codeprep.clearAll', () => selCmd.clearAll()),
    vscode.commands.registerCommand('codeprep.invertSelection', () => selCmd.invert()),
    vscode.commands.registerCommand('codeprep.savePreset', () => selCmd.savePreset()),
    vscode.commands.registerCommand('codeprep.loadPreset', () => selCmd.loadPreset()),
    vscode.commands.registerCommand('codeprep.selectByGrep', () => selCmd.selectByGrep())
  ];
}
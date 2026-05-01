import * as vscode from 'vscode';
import { SelectionUseCase } from '../features/selection/application/SelectionUseCase';
import { PromptUseCase } from '../features/prompt/application/PromptUseCase';
import { OutputEngine } from '../features/engine/domain/OutputEngine';
import { UIController } from '../features/ui/application/UIController';
import { VSCodeWorkspaceRepository } from '../features/selection/infrastructure/VSCodeWorkspaceRepository';
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
  const gitCmd = new GitCommands(selectionUseCase, uiController, root);
  const outCmd = new OutputCommands(selectionUseCase, promptUseCase, engine, root);
  const selCmd = new SelectionCommands(selectionUseCase, uiController, workspaceRepo);

  return [
    vscode.commands.registerCommand('codeprep.refreshTree', () => uiController.refresh()),
    vscode.commands.registerCommand('codeprep.gitMenu', () => gitCmd.showMenu()),
    vscode.commands.registerCommand('codeprep.generate', () => outCmd.generate()),
    vscode.commands.registerCommand('codeprep.selectAll', () => selCmd.selectAll()),
    vscode.commands.registerCommand('codeprep.clearAll', () => selCmd.clearAll()),
    vscode.commands.registerCommand('codeprep.invertSelection', () => selCmd.invert()),
    vscode.commands.registerCommand('codeprep.savePreset', () => selCmd.savePreset()),
    vscode.commands.registerCommand('codeprep.loadPreset', () => selCmd.loadPreset()),
    vscode.commands.registerCommand('codeprep.openSettings', () => 
      vscode.commands.executeCommand('workbench.action.openSettings', '@ext:codeprep'))
  ];
}
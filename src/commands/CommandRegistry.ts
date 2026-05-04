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
import { IFileSystem } from '../shared/domain/IFileSystem';
import { IGitClient } from '../features/git/domain/IGitClient';

export interface RegistryDeps {
  context: vscode.ExtensionContext;
  selectionUseCase: SelectionUseCase;
  promptUseCase: PromptUseCase;
  uiController: UIController;
  engine: OutputEngine;
  workspaceRepo: VSCodeWorkspaceRepository;
  fileSystem: IFileSystem;
  gitClient: IGitClient;
  root: string | undefined;
}

export function registerAllCommands(d: RegistryDeps): vscode.Disposable[] {
  const searchRepo = new VSCodeSearchRepository(d.root || '');
  const gitCmd = new GitCommands(d.selectionUseCase, d.uiController, d.gitClient, d.root);
  const outCmd = new OutputCommands({ selectionUseCase: d.selectionUseCase, promptUseCase: d.promptUseCase, engine: d.engine, fileSystem: d.fileSystem, root: d.root });
  const selCmd = new SelectionCommands({ useCase: d.selectionUseCase, ui: d.uiController, repo: d.workspaceRepo, searchRepo, gitClient: d.gitClient, root: d.root });

  return [
    ...registerMenuCommands(selCmd, gitCmd),
    ...registerActionCommands(d.uiController, outCmd),
    ...registerPromptCommands(d.promptUseCase, d.selectionUseCase, d.uiController, d.root),
    ...registerSelectionUtilityCommands(selCmd)
  ];
}


function registerMenuCommands(selCmd: SelectionCommands, gitCmd: GitCommands): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('codeprep.selectionMenu', () => selCmd.showSelectionMenu()),
    vscode.commands.registerCommand('codeprep.presetMenu', () => selCmd.showPresetMenu()),
    vscode.commands.registerCommand('codeprep.gitMenu', () => gitCmd.showMenu())
  ];
}

function registerActionCommands(ui: UIController, out: OutputCommands): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('codeprep.refreshTree', () => ui.refresh()),
    vscode.commands.registerCommand('codeprep.generate', () => out.generate()),
    vscode.commands.registerCommand('codeprep.openSettings', () => 
      vscode.commands.executeCommand('workbench.action.openSettings', '@ext:codeprep'))
  ];
}

function registerPromptCommands(prompt: PromptUseCase, selection: SelectionUseCase, ui: UIController, root: string | undefined): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('codeprep.selectPrompt', async () => {
      const p = await prompt.getAvailablePrompts();
      const items = p.names.map(n => ({ label: n, description: p.findByName(n)?.summary }));
      const s = await vscode.window.showQuickPick(items, { placeHolder: '挿入するプロンプトを選択' });
      if (s) prompt.selectPrompt(s.label);
    }),
    vscode.commands.registerCommand('codeprep.addToSelection', async (uri: vscode.Uri) => {
      if (uri && root) {
        selection.currentSelection.set(path.relative(root, uri.fsPath).replace(/\\/g, '/'), true);
        await ui.refresh();
      }
    })
  ];
}

function registerSelectionUtilityCommands(sel: SelectionCommands): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('codeprep.selectAll', () => sel.selectAll()),
    vscode.commands.registerCommand('codeprep.clearAll', () => sel.clearAll()),
    vscode.commands.registerCommand('codeprep.invertSelection', () => sel.invert()),
    vscode.commands.registerCommand('codeprep.savePreset', () => sel.savePreset()),
    vscode.commands.registerCommand('codeprep.loadPreset', () => sel.loadPreset()),
    vscode.commands.registerCommand('codeprep.selectByGrep', () => sel.selectByGrep())
  ];
}

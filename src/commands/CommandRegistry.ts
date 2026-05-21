import * as vscode from 'vscode';
import * as path from 'path';
import { t } from '../utils/i18n';
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
import { PatchUseCase } from '../features/patch/application/PatchUseCase';
import { PatchCommands } from './PatchCommands';


export interface RegistryDeps {
  context: vscode.ExtensionContext;
  selectionUseCase: SelectionUseCase;
  promptUseCase: PromptUseCase;
  uiController: UIController;
  engine: OutputEngine;
  workspaceRepo: VSCodeWorkspaceRepository;
  fileSystem: IFileSystem;
  gitClient: IGitClient;
  patchUseCase: PatchUseCase;
  root: string | undefined;
}


export function registerAllCommands(d: RegistryDeps): vscode.Disposable[] {
  const searchRepo = new VSCodeSearchRepository(d.root || '');
  const gitCmd = new GitCommands(d.selectionUseCase, d.uiController, d.gitClient, d.root);
  const outCmd = new OutputCommands({ selectionUseCase: d.selectionUseCase, promptUseCase: d.promptUseCase, engine: d.engine, fileSystem: d.fileSystem, root: d.root });
  const selCmd = new SelectionCommands({ useCase: d.selectionUseCase, ui: d.uiController, repo: d.workspaceRepo, searchRepo, gitClient: d.gitClient, root: d.root });
  const patchCmd = new PatchCommands(d.patchUseCase, d.root, d.gitClient);

  return [
    ...registerMenuCommands(selCmd, gitCmd),
    ...registerActionCommands(d.uiController, outCmd),
    ...registerPromptCommands(d.promptUseCase, d.selectionUseCase, d.uiController, d.root),
    ...registerSelectionUtilityCommands(selCmd),
    ...registerContextMenuCommands(d.root),
    ...registerPatchCommands(patchCmd)
  ];
}

function registerContextMenuCommands(root: string | undefined): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('codeprep.copyPathRelative', async (arg: any) => {
      const fsPath = extractFsPath(arg);
      if (!fsPath) return;
      if (!root) {
        vscode.window.showWarningMessage(t('workspaceRootUndefined'));
        return;
      }
      const rel = path.relative(root, fsPath).replace(/\\/g, '/');
      await vscode.env.clipboard.writeText(rel);
      vscode.window.showInformationMessage(t('copiedRelativePath'));
    }),
    vscode.commands.registerCommand('codeprep.copyPathAbsolute', async (arg: any) => {
      const fsPath = extractFsPath(arg);
      if (!fsPath) return;
      await vscode.env.clipboard.writeText(fsPath);
      vscode.window.showInformationMessage(t('copiedAbsolutePath'));
    })
  ];
}

function extractFsPath(arg: any): string | undefined {
  if (!arg) return undefined;
  // vscode.Uri
  if (typeof arg === 'object' && 'fsPath' in arg && typeof arg.fsPath === 'string') return arg.fsPath;
  // Tree item: has resourceUri
  if (typeof arg === 'object' && 'resourceUri' in arg && arg.resourceUri && typeof arg.resourceUri.fsPath === 'string') return arg.resourceUri.fsPath;
  // custom node with fullPath
  if (typeof arg === 'object' && 'fullPath' in arg && typeof arg.fullPath === 'string') return arg.fullPath;
  // maybe a plain path string
  if (typeof arg === 'string') return arg;
  return undefined;
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
    vscode.commands.registerCommand('codeprep.generateStructure', () => out.generateStructure()),
    vscode.commands.registerCommand('codeprep.openSettings', () =>
      vscode.commands.executeCommand('workbench.action.openSettings', '@ext:codeprep'))
  ];
}

function registerPromptCommands(prompt: PromptUseCase, selection: SelectionUseCase, ui: UIController, root: string | undefined): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('codeprep.selectPrompt', async () => {
      const p = await prompt.getAvailablePrompts();
      const clearLabel = t('command.clearPrompt');
      const items = [
        { label: `$(trash) ${clearLabel}`, description: t('command.clearPromptDescription') },
        ...p.names.map(n => ({ label: n, description: p.findByName(n)?.summary }))
      ];
      const s = await vscode.window.showQuickPick(items, { placeHolder: t('prompt.selectPlaceholder',) || '挿入するプロンプトを選択' });
      if (!s) return;
      if (s.label === `$(trash) ${clearLabel}`) {
        prompt.selectPrompt(undefined);
        vscode.window.showInformationMessage(t('promptCleared') || 'プロンプトをクリアしました。');
      } else {
        prompt.selectPrompt(s.label);
      }
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
    vscode.commands.registerCommand('codeprep.selectByGrep', () => sel.selectByGrep()),
    vscode.commands.registerCommand('codeprep.configureGenerationOptions', () => sel.configureGenerationOptions())
  ];
}

function registerPatchCommands(patch: PatchCommands): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('codeprep.previewPatch', () => patch.previewPatch()),
    vscode.commands.registerCommand('codeprep.previewPatchMenu', () => patch.previewPatchMenu()),
    vscode.commands.registerCommand('codeprep.previewSmartPatch', () => patch.previewSmartPatch()),
    vscode.commands.registerCommand('codeprep.applyPatch', () => patch.applyPatch()),
    vscode.commands.registerCommand('codeprep.applyAllPatches', () => patch.applyAllPatches()),
    vscode.commands.registerCommand('codeprep.copyVerifyPrompt', (uri: vscode.Uri) => {
      return patch.copyVerifyPrompt(uri);
    })
  ];
}



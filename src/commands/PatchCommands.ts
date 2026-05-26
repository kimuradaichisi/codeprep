/*
 * Copyright 2026 CodePrep Contributors
 */
import * as vscode from 'vscode';
import * as path from 'path';
import { t } from '../utils/i18n';
import { PatchUseCase } from '../features/patch/application/PatchUseCase';
import { IGitClient } from '../features/git/domain/IGitClient';
import { SmartPatchHandler } from './SmartPatchHandler';
import { LegacyPatchHandler } from './LegacyPatchHandler';

export class PatchCommands {
  private readonly smartHandler: SmartPatchHandler;
  private readonly legacyHandler: LegacyPatchHandler;

  constructor(
    private readonly patchUseCase: PatchUseCase,
    private readonly root: string | undefined,
    private readonly gitClient?: IGitClient
  ) {
    this.smartHandler = new SmartPatchHandler(root, gitClient);
    this.legacyHandler = new LegacyPatchHandler(root);
  }

  public async previewPatch(): Promise<void> {
    const result = await this.patchUseCase.previewPatch(this.root);
    if (result.isFailure) {
      vscode.window.showErrorMessage(t('patchFailed', result.error.message));
    }
  }

  public async applyAllPatches(): Promise<void> {
    const result = await this.patchUseCase.applyAllPatches(this.root);
    if (result.isFailure) {
      vscode.window.showErrorMessage(t('applyFailed', result.error.message));
    }
  }

  public async copyVerifyPrompt(uri: vscode.Uri): Promise<void> {
    await this.patchUseCase.copyVerifyPrompt(uri);
  }

  public async previewSmartPatch(): Promise<void> {
    await this.smartHandler.handle();
  }

  public async previewPatchLegacy(): Promise<void> {
    await this.legacyHandler.handle();
  }

  public async previewPatchMenu(): Promise<void> {
    const pick = await vscode.window.showQuickPick([
      { label: 'Preview: Clipboard patches', description: 'Parse traditional patch format from clipboard' },
      { label: 'Preview: Smart patches', description: 'Parse AI / smart patch candidates' }
    ], { placeHolder: 'Choose preview mode' });
    if (!pick) return;
    if (pick.label.startsWith('Preview: Clipboard')) await this.previewPatchLegacy();
    else await this.previewSmartPatch();
  }

  public async applyPatch(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.uri.scheme !== 'codeprep-patch') return;
    const relPath = editor.document.uri.path;
    const fullPath = vscode.Uri.file(path.join(this.root || '', relPath));
    await this.ensureDirectory(fullPath);
    const edit = new vscode.WorkspaceEdit();
    await this.prepareEdit(edit, fullPath, editor.document.getText());
    if (await vscode.workspace.applyEdit(edit)) {
      await this.finalizeApply(relPath);
    }
  }

  private async finalizeApply(relPath: string): Promise<void> {
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    vscode.window.showInformationMessage(t('appliedPatchTo', relPath));
  }

  private async ensureDirectory(fileUri: vscode.Uri): Promise<void> {
    const dirUri = vscode.Uri.file(path.dirname(fileUri.fsPath));
    await vscode.workspace.fs.createDirectory(dirUri);
  }

  private async prepareEdit(edit: vscode.WorkspaceEdit, uri: vscode.Uri, content: string): Promise<void> {
    try {
      await vscode.workspace.fs.stat(uri);
      edit.replace(uri, new vscode.Range(0, 0, 100000, 0), content);
    } catch {
      edit.createFile(uri, { overwrite: true });
      edit.insert(uri, new vscode.Position(0, 0), content);
    }
  }
}
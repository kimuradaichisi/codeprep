/*
 * Copyright 2026 CodePrep Contributors
 */
import * as vscode from 'vscode';
import { t } from '../utils/i18n';
import * as path from 'path';
import { PatchUseCase } from '../features/patch/application/PatchUseCase';
import { SmartPatchUseCase } from '../features/patch/application/SmartPatchUseCase';
import { PatchCache } from '../features/patch/domain/PatchCache';

export class PatchCommands {
  constructor(
    private readonly patchUseCase: PatchUseCase,
    private readonly root: string | undefined
  ) { }

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

  /** ✅ 新機能：AI検証用プロンプトをコピー */
  public async copyVerifyPrompt(uri: vscode.Uri): Promise<void> {
    await this.patchUseCase.copyVerifyPrompt(uri);
  }

  /** 新機能：スマートパッチをクリップボードから解析してプレビューを開く（MVP） */
  public async previewSmartPatch(): Promise<void> {
    const text = await vscode.env.clipboard.readText();
    if (!text || text.trim() === '') {
      vscode.window.showWarningMessage(t('noClipboardText'));
      return;
    }

    // For MVP, supply empty workspaceFiles — resolver will attempt best-effort.
    const smart = new SmartPatchUseCase({ readFile: async (_p: string) => '' }, [], []);
    const plans = await smart.planFromText(text);
    if (!plans || plans.length === 0) {
      vscode.window.showInformationMessage(t('noPatchCandidates'));
      return;
    }

    for (let i = 0; i < plans.length; i++) {
      const p = plans[i];
      const id = PatchCache.generateId();
      PatchCache.set(id, p.diff.replace(/\r\n/g, '\n'));
      const uri = vscode.Uri.parse(`codeprep-patch:smart-${i}?id=${id}`);
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, { preview: false });
    }
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
      const range = new vscode.Range(0, 0, 100000, 0);
      edit.replace(uri, range, content);
    } catch {
      edit.createFile(uri, { overwrite: true });
      edit.insert(uri, new vscode.Position(0, 0), content);
    }
  }
}
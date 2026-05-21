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
    // Collect workspace files (prefer files under the configured root) to improve resolution.
    let workspaceFiles: string[] = [];
    try {
      const uris = await vscode.workspace.findFiles('**/*', '**/node_modules/**');
      const rootPrefix = this.root ? (this.root.endsWith('/') ? this.root : this.root + path.sep) : undefined;
      workspaceFiles = uris
        .map(u => u.fsPath)
        .filter(p => !rootPrefix || p.startsWith(rootPrefix));
    } catch (e) {
      // ignore and continue with empty list
      workspaceFiles = [];
    }

    const fsLike = {
      readFile: async (p: string) => {
        try {
          const bytes = await vscode.workspace.fs.readFile(vscode.Uri.file(p));
          return new TextDecoder().decode(bytes);
        } catch {
          return '';
        }
      }
    };

    // gather recent files by mtime to help resolver prefer recently edited files
    let recentFiles: string[] = [];
    try {
      const stats = await Promise.all(workspaceFiles.map(async p => {
        try {
          const s = await vscode.workspace.fs.stat(vscode.Uri.file(p));
          return { p, mtime: s.mtime };
        } catch {
          return { p, mtime: 0 };
        }
      }));
      recentFiles = stats.sort((a, b) => b.mtime - a.mtime).slice(0, 50).map(s => s.p);
    } catch {
      recentFiles = [];
    }

    const smart = new SmartPatchUseCase(fsLike, workspaceFiles, recentFiles);
    const plans = await smart.planFromText(text);
    if (!plans || plans.length === 0) {
      vscode.window.showInformationMessage(t('noPatchCandidates'));
      return;
    }

    // Present plans in QuickPick and open the selected one (or open all)
    const items: vscode.QuickPickItem[] = plans.map((p, idx) => ({
      label: p.targetPath || `<unknown:${idx}>`,
      description: `${p.confidence.level} (${Math.round(p.confidence.score)})`,
      detail: p.diff.split('\n').slice(0, 3).join('\n')
    }));
    items.unshift({ label: '$(list-selection) Open All', description: `${plans.length} candidates`, detail: 'Open all candidates in editors' });

    const pick = await vscode.window.showQuickPick(items, { placeHolder: t('selectPatchCandidate') || 'Select patch candidate to preview' });
    if (!pick) return;

    if (pick.label.startsWith('$(list-selection)')) {
      for (let i = 0; i < plans.length; i++) {
        const p = plans[i];
        const id = PatchCache.generateId();
        PatchCache.set(id, p.diff.replace(/\r\n/g, '\n'));
        const uri = vscode.Uri.parse(`codeprep-patch:smart-${i}?id=${id}`);
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc, { preview: false });
      }
      return;
    }

    const selIndex = items.findIndex(it => it === pick) - 1; // -1 because we unshifted Open All
    const plan = plans[selIndex >= 0 ? selIndex : 0];
    const id = PatchCache.generateId();
    PatchCache.set(id, plan.diff.replace(/\r\n/g, '\n'));
    const uri = vscode.Uri.parse(`codeprep-patch:smart-${selIndex}?id=${id}`);
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, { preview: false });
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
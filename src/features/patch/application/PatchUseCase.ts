/*
 * Copyright 2026 CodePrep Contributors
 */
import * as vscode from 'vscode';
import { t } from '../../../utils/i18n';
import * as path from 'path';
import { Result, ok, fail } from '../../../shared/domain/Result';
import { IClipboard } from '../domain/IClipboard';
import { ClipParser } from '../domain/ClipParser';
import { OmitHealer } from '../domain/OmitHealer';
import { IFileSystem } from '../../../shared/domain/IFileSystem';
import { PatchCache } from '../domain/PatchCache';

export class PatchUseCase {
  private parser = new ClipParser();
  private healer = new OmitHealer();

  constructor(private clipboard: IClipboard, private fileSystem: IFileSystem) { }

  public async previewPatch(root: string | undefined): Promise<Result<void>> {
    const textRes = await this.clipboard.readText();
    if (textRes.isFailure) return this.notifyError('Clipboard is empty.');

    const parseRes = this.parser.parse(textRes.value);
    if (parseRes.isFailure) return this.notifyError('No patch found.');

    for (const patch of parseRes.value) {
      const res = await this.openDiff(root, patch.filePath, patch.code);
      if (res.isFailure) vscode.window.showWarningMessage(t('failedPatch', patch.filePath));
    }
    return ok(undefined);
  }

  private async openDiff(root: string | undefined, rel: string, code: string): Promise<Result<void>> {
    if (!root) return fail(new Error('No root.'));
    const full = vscode.Uri.file(path.join(root, rel));
    const res = await this.fileSystem.readFile(full.fsPath);
    const original = res.isSuccess ? res.value : '';

    const healed = this.healer.heal(original, code);
    if (healed.isFailure) return fail(healed.error);

    await this.handleSafetyCheck(original, healed.value.code, rel, healed.value.diffRatio);
    const info = this.prepareDiffInfo(full, rel, healed.value.code, original !== '');
    await vscode.commands.executeCommand('vscode.diff', info.left, info.right, info.title, { preview: false });
    return ok(undefined);
  }

  private async handleSafetyCheck(before: string, after: string, rel: string, ratio: number): Promise<void> {
    if (ratio < 0.3) return;
    await this.generateVerificationPrompt(before, after, rel);
    vscode.window.showWarningMessage(t('criticalChangeDetected', String(Math.round(ratio * 100))));
  }

  public async copyVerifyPrompt(uri: vscode.Uri): Promise<void> {
    const id = new URLSearchParams(uri.query).get('id') || '';
    const healed = PatchCache.get(id) || '';
    const root = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';

    // ✅ 型エラー(2339)の修正: readFileの結果を一度変数に受け、isSuccessで判定する
    const res = await this.fileSystem.readFile(path.join(root, uri.path));
    const original = res.isSuccess ? res.value : '';

    await this.generateVerificationPrompt(original, healed, uri.path);
    vscode.window.showInformationMessage(t('aiVerifyPromptCopied'));
  }

  private async generateVerificationPrompt(before: string, after: string, relPath: string): Promise<void> {
    const prompt = `以下のパッチ適用結果を検証してください。\nファイル: ${relPath}\n\n### 修正前\n${before}\n\n### 修正後\n${after}`;
    await vscode.env.clipboard.writeText(prompt);
  }

  private prepareDiffInfo(full: vscode.Uri, rel: string, healed: string, exists: boolean) {
    const id = PatchCache.generateId();
    PatchCache.set(id, healed.replace(/\r\n/g, '\n'));
    const norm = rel.replace(/\\/g, '/');
    const right = vscode.Uri.parse(`codeprep-patch:${norm}?id=${id}`);
    const left = exists ? full : vscode.Uri.parse(`codeprep-patch:empty?id=empty`);
    const title = exists ? `Patch: ${rel}` : `Patch: ${rel} (New File)`;
    return { left, right, title };
  }

  public async applyAllPatches(root: string | undefined): Promise<Result<void>> {
    const textRes = await this.clipboard.readText();
    const val = (textRes.isSuccess ? textRes.value : '') || '';
    const patches = this.parser.parse(val);
    if (patches.isFailure) return fail(patches.error);

    // ✅ 進捗バーを表示
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: t('progress.applyingPatches'),
      cancellable: false
    }, async (progress) => {
      for (let i = 0; i < patches.value.length; i++) {
        const patch = patches.value[i];
        progress.report({ message: t('progress.applyingFile', patch.filePath), increment: (i / patches.value.length) * 100 });
        await this.performApplyAndOpen(root, patch.filePath, patch.code);
      }
    });

    vscode.window.showInformationMessage(t('successfullyAppliedPatches', String(patches.value.length)));
    return ok(undefined);
  }

  private async performApplyAndOpen(root: string | undefined, rel: string, code: string): Promise<void> {
    if (!root) return;
    const full = path.join(root, rel);
    const res = await this.fileSystem.readFile(full);
    const original = res.isSuccess ? res.value : '';
    const healed = this.healer.heal(original, code);

    if (healed.isSuccess) {
      await this.fileSystem.writeFile(full, healed.value.code);
      const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(full));
      await vscode.window.showTextDocument(doc, { preview: false });
    }
  }

  private notifyError(msg: string): Result<void> {
    vscode.window.showErrorMessage(msg);
    return fail(new Error(msg));
  }
}
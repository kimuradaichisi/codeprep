import * as vscode from 'vscode';
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

  constructor(
    private clipboard: IClipboard,
    private fileSystem: IFileSystem
  ) {}

  public async previewPatch(root: string | undefined): Promise<Result<void>> {
    const textResult = await this.clipboard.readText();
    if (textResult.isFailure) return this.notifyError('Clipboard is empty.');
    
    const parseResult = this.parser.parse(textResult.value);
    if (parseResult.isFailure) return this.notifyError('No patch found. Ensure file path is specified.');

    for (const patch of parseResult.value) {
      const res = await this.openDiff(root, patch.filePath, patch.code);
      if (res.isFailure) vscode.window.showWarningMessage(`Patch failed: ${patch.filePath} - ${res.error.message}`);
    }
    return ok(undefined);
  }

  private notifyError(msg: string): Result<void> {
    vscode.window.showErrorMessage(msg);
    return fail(new Error(msg));
  }


  private async openDiff(root: string | undefined, relPath: string, patchCode: string): Promise<Result<void>> {
    if (!root) return fail(new Error('Workspace root is not defined.'));
    const fullPath = vscode.Uri.file(path.join(root, relPath));
    const originalRes = await this.fileSystem.readFile(fullPath.fsPath);
    const original = originalRes.isSuccess ? originalRes.value : '';
    const healed = this.healer.heal(original, patchCode);
    if (healed.isFailure) return fail(healed.error);

    const { left, right, title } = this.prepareDiffInfo(fullPath, relPath, healed.value, originalRes.isSuccess);
    await vscode.commands.executeCommand('vscode.diff', left, right, title, { preview: false });
    return ok(undefined);
  }

  private prepareDiffInfo(fullPath: vscode.Uri, relPath: string, healed: string, exists: boolean) {
    const id = PatchCache.generateId();
    PatchCache.set(id, healed.replace(/\r\n/g, '\n'));
    const normPath = relPath.replace(/\\/g, '/');
    const right = vscode.Uri.parse(`codeprep-patch:${normPath}?id=${id}`);
    const left = exists ? fullPath : vscode.Uri.parse(`codeprep-patch:empty?id=empty`);
    const title = exists ? `Patch: ${relPath}` : `Patch: ${relPath} (New File)`;
    return { left, right, title };
  }

  public async applyAllPatches(root: string | undefined): Promise<Result<void>> {
    const textRes = await this.clipboard.readText();
    if (textRes.isFailure) return fail(new Error('Clipboard is empty.'));
    const patches = this.parser.parse(textRes.value);
    if (patches.isFailure) return fail(patches.error);

    for (const patch of patches.value) {
      await this.performApplyAndOpen(root, patch.filePath, patch.code);
    }
    vscode.window.showInformationMessage(`Applied ${patches.value.length} patches.`);
    return ok(undefined);
  }

  private async performApplyAndOpen(root: string | undefined, relPath: string, code: string): Promise<void> {
    const res = await this.performApply(root, relPath, code);
    if (res.isFailure) {
      vscode.window.showWarningMessage(`Failed: ${relPath}`);
      return;
    }
    const fullPath = path.join(root!, relPath);
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(fullPath));
    await vscode.window.showTextDocument(doc, { preview: false });
  }

  private async performApply(root: string | undefined, relPath: string, code: string): Promise<Result<void>> {
    if (!root) return fail(new Error('Root not defined.'));
    const fullPath = path.join(root, relPath);
    const originalRes = await this.fileSystem.readFile(fullPath);
    const original = originalRes.isSuccess ? originalRes.value : '';
    
    const healed = this.healer.heal(original, code);
    if (healed.isFailure) return fail(healed.error);
    return this.fileSystem.writeFile(fullPath, healed.value);
  }
}

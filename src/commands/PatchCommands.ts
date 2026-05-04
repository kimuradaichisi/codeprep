import * as vscode from 'vscode';
import * as path from 'path';
import { PatchUseCase } from '../features/patch/application/PatchUseCase';

export class PatchCommands {
  constructor(
    private readonly patchUseCase: PatchUseCase,
    private readonly root: string | undefined
  ) {}

  public async previewPatch(): Promise<void> {
    const result = await this.patchUseCase.previewPatch(this.root);
    if (result.isFailure) {
      vscode.window.showErrorMessage(`Patch failed: ${result.error.message}`);
    }
  }

  public async applyAllPatches(): Promise<void> {
    const result = await this.patchUseCase.applyAllPatches(this.root);
    if (result.isFailure) {
      vscode.window.showErrorMessage(`Apply failed: ${result.error.message}`);
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
    vscode.window.showInformationMessage(`Applied patch to ${relPath}`);
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

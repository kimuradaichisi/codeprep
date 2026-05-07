/*
 * Copyright 2026 CodePrep Contributors
 */
import * as vscode from 'vscode';

export class OutputEditorService {
  public async openInEditor(content: string, format: string): Promise<void> {
    const info = this.getFormatInfo(format);
    const uri = vscode.Uri.parse(`untitled:CodePrep Output${info.ext}`);
    try {
      const doc = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.One });
      await editor.edit(eb => eb.replace(new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length)), content));
    } catch {
      const doc = await vscode.workspace.openTextDocument({ content, language: info.lang });
      await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.One });
    }
  }

  public getFormatInfo(format: string): { ext: string, lang: string } {
    if (format === 'json') return { ext: '.json', lang: 'json' };
    if (format === 'xml') return { ext: '.xml', lang: 'xml' };
    return { ext: '.md', lang: 'markdown' };
  }
}
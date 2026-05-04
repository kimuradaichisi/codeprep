import * as vscode from 'vscode';
import { PatchCache } from '../domain/PatchCache';

export class PatchPreviewProvider implements vscode.TextDocumentContentProvider {
  public static readonly scheme = 'codeprep-patch';

  public provideTextDocumentContent(uri: vscode.Uri): string {
    const params = new URLSearchParams(uri.query);
    const id = params.get('id') || '';
    return PatchCache.get(id);
  }
}

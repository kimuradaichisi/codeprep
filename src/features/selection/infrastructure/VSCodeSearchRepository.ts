import * as vscode from 'vscode';
import { ISearchRepository } from '../domain/ISearchRepository';
import { getRelativePath } from '../../../utils/path';

interface TextSearchMatch {
  uri: vscode.Uri;
}


export class VSCodeSearchRepository implements ISearchRepository {
  constructor(private workspaceRoot: string) {}

  /**
   * VSCode 内蔵の ripgrep エンジンを使用して高速検索を行う。
   */
  public async search(query: string): Promise<string[]> {
    const results = new Set<string>();
    await this.executeSearch(query, (res) => {
      results.add(getRelativePath(this.workspaceRoot, res.uri.fsPath));
    });
    return Array.from(results);
  }

  private async executeSearch(query: string, onMatch: (res: TextSearchMatch) => void): Promise<void> {
    const q = { pattern: query, isCaseSensitive: false };
    const opts = { useIgnoreFiles: true };
    try {
      await this.runSearchEngine(q, opts, onMatch);
    } catch {
      await this.performLocalSearch(query, onMatch);
    }
  }

  private async runSearchEngine(
    query: { pattern: string; isCaseSensitive: boolean },
    opts: { useIgnoreFiles: boolean },
    onMatch: (res: TextSearchMatch) => void
  ): Promise<void> {
    if (typeof (vscode.workspace as unknown as Record<string, unknown>).findTextInFiles === 'function') {
      const ws = vscode.workspace as unknown as { findTextInFiles: (q: unknown, o: unknown, cb: (r: { uri: vscode.Uri }) => void) => Promise<void> };
      await ws.findTextInFiles(query, opts, (r) => onMatch({ uri: r.uri }));
    } else {
      await vscode.commands.executeCommand('vscode.executeTextSearch', query, opts, { report: onMatch });
    }
  }

  private async performLocalSearch(query: string, onMatch: (res: TextSearchMatch) => void): Promise<void> {
    const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**');
    for (const file of files) {
      try {
        const content = await vscode.workspace.fs.readFile(file);
        const text = new TextDecoder().decode(content);
        if (text.toLowerCase().includes(query.toLowerCase())) {
          onMatch({ uri: file });
        }
      } catch { /* スキップ */ }
    }
  }








}
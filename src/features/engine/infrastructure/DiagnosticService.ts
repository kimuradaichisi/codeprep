/*
 * Copyright 2026 CodePrep Contributors
 */
import * as vscode from 'vscode';
import * as path from 'path';

export class DiagnosticService {
  /**
   * 指定されたパスに関連する VSCode の診断情報（エラー・警告）をフォーマットする
   */
  public formatErrors(paths: string[]): string {
    const diags = vscode.languages.getDiagnostics().filter(([uri]) => 
      paths.some(p => uri.fsPath.replace(/\\/g, '/').endsWith(p))
    );
    
    if (diags.length === 0) return '';

    const blocks = diags.map(([uri, ds]) => {
      const msgs = ds.map(d => `- [Line ${d.range.start.line + 1}] ${d.message}`).join('\n');
      return `### ${path.basename(uri.fsPath)}\n${msgs}`;
    });

    return "## Related Errors\n" + blocks.join('\n') + "\n\n";
  }
}
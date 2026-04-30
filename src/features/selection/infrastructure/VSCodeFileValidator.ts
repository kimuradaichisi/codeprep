import * as vscode from 'vscode';
import * as path from 'path';
import { IFileValidator } from '../domain/IFileValidator';

/**
 * VSCode API を使用したファイル検証実装
 */
export class VSCodeFileValidator implements IFileValidator {
  constructor(private workspaceRoot: string) {}

  public async exists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.workspaceRoot, filePath);
      await vscode.workspace.fs.stat(vscode.Uri.file(fullPath));
      return true;
    } catch {
      return false;
    }
  }

  public isExcluded(filePath: string): boolean {
    const config = vscode.workspace.getConfiguration('codeprep');
    const excludePatterns = config.get<string[]>('exclude') || [];
    
    const normalizedPath = filePath.replace(/\\/g, '/');
    const pathParts = normalizedPath.split('/');

    return excludePatterns.some((pattern) => {
      const p = pattern.replace(/\\/g, '/');
      const segments = p.split('/').filter((s) => s !== '**' && s !== '');
      return segments.some((seg) => pathParts.includes(seg));
    });
  }
}

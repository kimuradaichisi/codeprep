/*
 * Copyright 2026 CodePrep Contributors
 */
import * as vscode from 'vscode';
import * as path from 'path';
import { IFileValidator } from '../domain/IFileValidator';
import { PathValidator } from '../../../shared/domain/PathValidator';

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
    // まず共通ルール（PathValidator）でチェック
    if (!PathValidator.isValidPath(filePath)) {
      return true;
    }

    // ユーザー設定の追加除外パターン
    const config = vscode.workspace.getConfiguration('codeprep');
    const excludePatterns = config.get<string[]>('exclude') || [];
    
    if (excludePatterns.length === 0) {
      return false;
    }

    const normalizedPath = filePath.replace(/\\/g, '/');
    
    return excludePatterns.some((pattern) => 
      this.matchesPattern(normalizedPath, pattern)
    );
  }

  private matchesPattern(path: string, pattern: string): boolean {
    const p = pattern.replace(/\\/g, '/');
    
    // ** ワイルドカード対応
    if (p.includes('**')) {
      // 簡易実装: **/dir → dir に部分一致
      const cleanPattern = p
        .replace(/\*\*\//g, '')
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*');
      const regex = new RegExp(`(^|/)${cleanPattern}(/|$)`);
      return regex.test(path);
    }
    
    // 単純な部分一致（ディレクトリ名またはパス部分）
    return path.includes(p) || path.split('/').includes(p);
  }
}
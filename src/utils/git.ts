import { exec } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';
import * as path from 'path';

const execAsync = promisify(exec);

export class GitUtils {
  /**
   * 変更されたファイル一覧を取得。
   * -c core.quotepath=false を付与することで日本語ファイル名の化けを防止。
   */
  static async getModifiedFiles(root: string): Promise<string[]> {
    try {
      // 日本語パス対応のため quotepath=false を設定して実行
      const cmd = 'git -c core.quotepath=false status --porcelain';
      const { stdout } = await execAsync(cmd, { cwd: root });
      
      return stdout.split('\n')
        .map(line => this.parseGitStatusLine(line))
        .filter((f): f is string => f.length > 0);
    } catch (e) {
      vscode.window.showErrorMessage(`CodePrep: Git status error - ${e}`);
      return [];
    }
  }

  private static parseGitStatusLine(line: string): string {
    if (line.length < 4) return '';
    let filePath = line.substring(3).trim();
    
    // ダブルクォートの除去（スペース対策）
    if (filePath.startsWith('"') && filePath.endsWith('"')) {
      filePath = filePath.slice(1, -1);
    }
    
    // 改名（A -> B）の場合は後のパス（B）を採用
    return filePath.includes(' -> ') ? filePath.split(' -> ')[1] : filePath;
  }

  static async getDiff(root: string): Promise<string> {
    try {
      const { stdout } = await execAsync('git diff HEAD', { cwd: root });
      return stdout;
    } catch (e) {
      vscode.window.showErrorMessage(`CodePrep: Git diff error - ${e}`);
      return '';
    }
  }

  /**
   * 変更ファイルに関連するテストファイルを探す。
   * 命名規則の揺れ（.test.ts, .spec.ts, _test.ts等）に対応。
   */
  static async findRelatedTests(root: string, modifiedFiles: string[]): Promise<string[]> {
    if (modifiedFiles.length === 0) return [];

    const modifiedBaseNames = new Set(
      modifiedFiles.map(f => path.basename(f, path.extname(f)).toLowerCase())
    );

    // 1回だけ全スキャン
    const allTestUris = await vscode.workspace.findFiles(
      '**/*.{spec,test,Test}.{ts,tsx,js,jsx}', 
      '**/node_modules/**'
    );

    const relatedTests: string[] = [];
    for (const uri of allTestUris) {
      const relativePath = vscode.workspace.asRelativePath(uri, false);
      const fileName = path.basename(relativePath).toLowerCase();
      
      // テストファイル名（例: user.test.ts）に変更ファイル名（user）が含まれているか照合
      const isMatch = Array.from(modifiedBaseNames).some(base => 
        fileName.startsWith(base) || fileName.includes(`${base}_`)
      );

      if (isMatch) relatedTests.push(relativePath);
    }

    return relatedTests;
  }
}
import { exec } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';
import * as path from 'path';

const execAsync = promisify(exec);

export class GitUtils {
  static async getModifiedFiles(root: string): Promise<string[]> {
    try {
      const { stdout } = await execAsync('git status --porcelain', { cwd: root });
      return stdout
        .split('\n')
        .map(line => {
          let filePath = line.substring(3).trim();
          // ダブルクォートで囲まれている場合は除去 (スペースを含むパス対策)
          if (filePath.startsWith('"') && filePath.endsWith('"')) {
            filePath = filePath.slice(1, -1);
          }
          // 改名対応
          return filePath.includes(' -> ') ? filePath.split(' -> ')[1] : filePath;
        })
        .filter(line => line.length > 0);
    } catch (e) {
      vscode.window.showErrorMessage(`CodePrep: Git status error - ${e}`);
      return [];
    }
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

  static async findRelatedTests(root: string, modifiedFiles: string[]): Promise<string[]> {
    if (modifiedFiles.length === 0) return [];

    // 1. 変更されたファイルのベース名（拡張子なし）をセットに持つ
    // 例: "src/domain/User.ts" -> "User"
    const modifiedBaseNames = new Set(
        modifiedFiles.map(f => path.basename(f, path.extname(f)))
    );

    // 2. プロジェクト内のテストファイルを「1回だけ」スキャンして全取得
    // node_modules は第2引数で明示的に除外
    const allTestUris = await vscode.workspace.findFiles(
        '**/*.{spec,test}.{ts,tsx,js,jsx}', 
        '**/node_modules/**'
    );

    const relatedTests: string[] = [];

    // 3. メモリ上で名前の照合を行う（ここが非常に高速）
    for (const uri of allTestUris) {
        const relativePath = vscode.workspace.asRelativePath(uri, false);
        const fileName = path.basename(relativePath);
        
        // テストファイル名から ".spec.ts" や ".test.ts" などを除いた本体を取り出す
        const testBaseName = fileName.split('.')[0]; 

        if (modifiedBaseNames.has(testBaseName)) {
        relatedTests.push(relativePath);
        }
    }

    return relatedTests;
    }
}
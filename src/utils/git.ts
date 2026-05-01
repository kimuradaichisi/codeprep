import { exec } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';
import * as path from 'path';

const execAsync = promisify(exec);

export class GitUtils {
  static async getModifiedFiles(root: string): Promise<string[]> {
    try {
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
    if (filePath.startsWith('"') && filePath.endsWith('"')) {
      filePath = filePath.slice(1, -1);
    }
    return filePath.includes(' -> ') ? filePath.split(' -> ')[1] : filePath;
  }

  /**
   * 差分を取得。excludePaths で指定されたファイルを除外する。
   */
  static async getDiff(root: string, excludePaths: string[] = []): Promise<string> {
    try {
      // GitのPathspecを使用して除外。例: git diff HEAD -- . ":(exclude)package.json"
      let cmd = 'git diff HEAD';
      if (excludePaths.length > 0) {
        const excludes = excludePaths.map(p => `":(exclude)${p}"`).join(' ');
        cmd += ` -- . ${excludes}`;
      }
      
      const { stdout } = await execAsync(cmd, { cwd: root });
      return stdout;
    } catch (e) {
      vscode.window.showErrorMessage(`CodePrep: Git diff error - ${e}`);
      return '';
    }
  }

  static async findRelatedTests(root: string, modifiedFiles: string[]): Promise<string[]> {
    if (modifiedFiles.length === 0) return [];
    const modifiedBaseNames = new Set(modifiedFiles.map(f => path.basename(f, path.extname(f)).toLowerCase()));
    const allTestUris = await vscode.workspace.findFiles('**/*.{spec,test,Test}.{ts,tsx,js,jsx}', '**/node_modules/**');
    const relatedTests: string[] = [];
    for (const uri of allTestUris) {
      const relativePath = vscode.workspace.asRelativePath(uri, false);
      const fileName = path.basename(relativePath).toLowerCase();
      const isMatch = Array.from(modifiedBaseNames).some(base => fileName.startsWith(base) || fileName.includes(`${base}_`));
      if (isMatch) relatedTests.push(relativePath);
    }
    return relatedTests;
  }
}
import * as vscode from 'vscode';
import * as path from 'path';
import { getRelativePath, normalizePath } from '../../../utils/path';

/**
 * VSCode ワークスペースのファイル検索を担当するクラス
 */
export class VSCodeWorkspaceRepository {
  private workspaceRoot: string;
  constructor(workspaceRoot: string) {
    this.workspaceRoot = normalizePath(workspaceRoot);
  }

  private getExcludePattern(): string | undefined {
    const config = vscode.workspace.getConfiguration('codeprep');
    const excludes = config.get<string[]>('exclude', []);
    if (excludes.length === 0) return undefined;
    if (excludes.length === 1) return excludes[0];
    return `{${excludes.join(',')}}`;
  }

  /**
   * 指定されたディレクトリ配下のすべてのファイルパスを取得する
   */
  public async getFilesUnder(relativePath: string): Promise<string[]> {
    const glob = relativePath === '' || relativePath === '.' ? '**/*' : `${relativePath}/**/*`;
    const pattern = new vscode.RelativePattern(this.workspaceRoot, glob);
    const uris = await vscode.workspace.findFiles(pattern, this.getExcludePattern());
    return uris.map(uri => getRelativePath(this.workspaceRoot, uri.fsPath));
  }

  public async getAllFiles(): Promise<string[]> {
    const files = await vscode.workspace.findFiles('**/*', this.getExcludePattern());
    return files.map((f) => getRelativePath(this.workspaceRoot, f.fsPath));
  }
}

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

  private async getExcludePattern(): Promise<string | undefined> {
    const config = vscode.workspace.getConfiguration('codeprep');
    const userExcludes = config.get<string[]>('exclude', []) || [];

    const gitignoreUri = vscode.Uri.file(path.join(this.workspaceRoot, '.gitignore'));
    let gitignorePatterns: string[] = [];
    try {
      const buf = await vscode.workspace.fs.readFile(gitignoreUri);
      const txt = new TextDecoder().decode(buf);
      gitignorePatterns = txt
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('!'))
        .map(p => {
          if (p.endsWith('/')) return `**/${p}**`;
          if (p.includes('*') || p.includes('?')) return `**/${p}`;
          return `**/${p}/**`;
        });
    } catch {
      // .gitignore が無ければ無視
    }

    const all = Array.from(new Set<string>([...userExcludes, ...gitignorePatterns].filter(Boolean)));
    if (all.length === 0) return undefined;
    if (all.length === 1) return all[0];
    return `{${all.join(',')}}`;
  }

  /**
   * 指定されたディレクトリ配下のすべてのファイルパスを取得する
   */
  public async getFilesUnder(relativePath: string): Promise<string[]> {
    const glob = relativePath === '' || relativePath === '.' ? '**/*' : `${relativePath}/**/*`;
    const pattern = new vscode.RelativePattern(this.workspaceRoot, glob);
    const exclude = await this.getExcludePattern();
    const uris = await vscode.workspace.findFiles(pattern, exclude);
    return uris.map(uri => getRelativePath(this.workspaceRoot, uri.fsPath));
  }

  public async getAllFiles(): Promise<string[]> {
    const exclude = await this.getExcludePattern();
    const files = await vscode.workspace.findFiles('**/*', exclude);
    return files.map((f) => getRelativePath(this.workspaceRoot, f.fsPath));
  }
}

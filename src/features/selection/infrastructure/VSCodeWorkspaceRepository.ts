import * as vscode from 'vscode';
import * as path from 'path';
import { getRelativePath, normalizePath } from '../../../utils/path';
import { DEFAULT_EXCLUDED_DIR_NAMES, SENSITIVE_EXCLUDED_PATTERNS } from '../../../shared/filesystem/defaultExcludes';

const DEFAULT_GLOBS = [
  ...DEFAULT_EXCLUDED_DIR_NAMES.map((n) => `**/${n}/**`),
  ...SENSITIVE_EXCLUDED_PATTERNS.map((p) => `**/${p}`),
];

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
    const useGitignore = config.get<boolean>('useGitignore', true) ?? true;

    const gitignorePatterns = useGitignore ? await this.readGitignorePatterns() : [];
    const all = Array.from(new Set<string>([...DEFAULT_GLOBS, ...userExcludes, ...gitignorePatterns].filter(Boolean)));
    if (all.length === 0) return undefined;
    if (all.length === 1) return all[0];
    return `{${all.join(',')}}`;
  }

  private async readGitignorePatterns(): Promise<string[]> {
    try {
      const gitignoreUri = vscode.Uri.file(path.join(this.workspaceRoot, '.gitignore'));
      const buf = await vscode.workspace.fs.readFile(gitignoreUri);
      const txt = new TextDecoder().decode(buf);
      return parseGitignoreToGlobs(txt);
    } catch {
      return [];
    }
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

function parseGitignoreToGlobs(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('!'))
    .map(p => {
      if (p.endsWith('/')) return `**/${p}**`;
      if (p.includes('*') || p.includes('?')) return `**/${p}`;
      return `**/${p}/**`;
    });
}

/*
 * Copyright 2026 CodePrep Contributors
 */
import * as vscode from 'vscode';
import { getRelativePath, normalizePath } from '../../../utils/path';
import { WorkspaceExcludeProvider } from './WorkspaceExcludeProvider';

/**
 * VSCode ワークスペースのファイル検索を担当するクラス
 */
export class VSCodeWorkspaceRepository {
  private readonly workspaceRoot: string;
  private readonly excludeProvider: WorkspaceExcludeProvider;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = normalizePath(workspaceRoot);
    this.excludeProvider = new WorkspaceExcludeProvider(this.workspaceRoot);
  }

  /**
   * 指定されたディレクトリ配下のすべてのファイルパスを取得する
   */
  public async getFilesUnder(relativePath: string): Promise<string[]> {
    const glob = relativePath === '' || relativePath === '.' ? '**/*' : `${relativePath}/**/*`;
    const pattern = new vscode.RelativePattern(this.workspaceRoot, glob);
    const exclude = await this.excludeProvider.getExcludePattern();
    const uris = await vscode.workspace.findFiles(pattern, exclude);
    return uris.map(uri => getRelativePath(this.workspaceRoot, uri.fsPath));
  }

  public async getAllFiles(): Promise<string[]> {
    const exclude = await this.excludeProvider.getExcludePattern();
    const files = await vscode.workspace.findFiles('**/*', exclude);
    return files.map((f) => getRelativePath(this.workspaceRoot, f.fsPath));
  }
}

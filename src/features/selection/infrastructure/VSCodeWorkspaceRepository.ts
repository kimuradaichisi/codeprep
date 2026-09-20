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
  private readonly rootUri?: vscode.Uri;
  private readonly excludeProvider: WorkspaceExcludeProvider;

  constructor(workspaceRoot: string, rootUri?: vscode.Uri) {
    this.workspaceRoot = normalizePath(workspaceRoot);
    this.rootUri = rootUri;
    this.excludeProvider = new WorkspaceExcludeProvider(this.workspaceRoot);
  }

  public async getFilesUnder(relativePath: string): Promise<string[]> {
    const glob = relativePath === '' || relativePath === '.' ? '**/*' : `${relativePath}/**/*`;
    const pattern = new vscode.RelativePattern(this.rootUri ?? this.workspaceRoot, glob);
    const exclude = await this.excludeProvider.getExcludePattern();
    const uris = await vscode.workspace.findFiles(pattern, exclude);
    return uris.map(uri => this.toRelativePath(uri));
  }

  public async getAllFiles(): Promise<string[]> {
    const exclude = await this.excludeProvider.getExcludePattern();
    const pattern = this.rootUri ? new vscode.RelativePattern(this.rootUri, '**/*') : '**/*';
    const files = await vscode.workspace.findFiles(pattern, exclude);
    return files.map((f) => this.toRelativePath(f));
  }

  private toRelativePath(uri: vscode.Uri): string {
    if (vscode.workspace.asRelativePath) {
      const rel = vscode.workspace.asRelativePath(uri, false);
      if (rel && rel !== uri.fsPath && rel !== uri.path) {
        return rel.replace(/\\/g, '/');
      }
    }
    const target = uri.fsPath || uri.path;
    return getRelativePath(this.workspaceRoot, target);
  }
}


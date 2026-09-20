/*
 * Copyright 2026 CodePrep Contributors
 */
import * as vscode from 'vscode';
import * as path from 'path';
import { WorkspacePathResolver } from '../application/WorkspacePathResolver';
import { WorkspaceExcludeProvider } from './WorkspaceExcludeProvider';
import {
  extractWorkspaceRelativePath,
  isEligibleForFallback,
  normalizeSeparators,
} from './pathMatchUtils';

export class VSCodeWorkspacePathResolver implements WorkspacePathResolver {
  private readonly workspaceRoot: string;
  private readonly rootUri?: vscode.Uri;
  private readonly excludeProvider: WorkspaceExcludeProvider;

  constructor(
    workspaceRoot: string,
    excludeProvider?: WorkspaceExcludeProvider,
    rootUri?: vscode.Uri
  ) {
    this.workspaceRoot = normalizeSeparators(workspaceRoot);
    this.rootUri = rootUri;
    this.excludeProvider = excludeProvider ?? new WorkspaceExcludeProvider(this.workspaceRoot);
  }


  public async resolve(paths: readonly string[]): Promise<string[]> {
    if (!this.workspaceRoot || paths.length === 0) return [];
    const resolved: string[] = [];
    const unresolved: string[] = [];

    await this.collectFastPathResults(paths, resolved, unresolved);
    await this.collectFallbackResults(unresolved, resolved);

    return Array.from(new Set(resolved));
  }

  private async collectFastPathResults(
    paths: readonly string[],
    resolved: string[],
    unresolved: string[]
  ): Promise<void> {
    for (const p of paths) {
      const match = await this.tryFastPath(p);
      if (match) {
        resolved.push(match);
      } else if (isEligibleForFallback(p)) {
        unresolved.push(p);
      }
    }
  }

  private async collectFallbackResults(
    unresolved: readonly string[],
    resolved: string[]
  ): Promise<void> {
    if (unresolved.length === 0) return;
    const exclude = await this.excludeProvider.getExcludePattern();
    for (const p of unresolved) {
      const match = await this.resolveTargetedFallback(p, exclude);
      if (match) resolved.push(match);
    }
  }

  private async tryFastPath(candidate: string): Promise<string | undefined> {
    const relPath = extractWorkspaceRelativePath(candidate, this.workspaceRoot);
    if (!relPath) return undefined;
    const fullPath = path.join(this.workspaceRoot, relPath);
    const exists = await this.fileExists(fullPath, relPath);
    return exists ? relPath.replace(/\\/g, '/') : undefined;
  }

  private async fileExists(fullPath: string, relPath: string): Promise<boolean> {
    try {
      const uri = this.rootUri
        ? vscode.Uri.joinPath(this.rootUri, relPath)
        : vscode.Uri.file(fullPath);
      const stat = await vscode.workspace.fs.stat(uri);
      return stat !== undefined;
    } catch {
      return false;
    }
  }

  private async resolveTargetedFallback(
    candidate: string,
    exclude: string | undefined
  ): Promise<string | undefined> {
    const clean = normalizeSeparators(candidate).replace(/^(\.\/|\/)+/, '');
    const glob = `**/${clean}`;
    const pattern = this.rootUri ? new vscode.RelativePattern(this.rootUri, glob) : glob;
    const matches = await vscode.workspace.findFiles(pattern, exclude, 2);
    if (matches.length !== 1) return undefined;
    return vscode.workspace.asRelativePath(matches[0], false).replace(/\\/g, '/');
  }
}


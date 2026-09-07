/*
 * Copyright 2026 CodePrep Contributors
 */
import * as vscode from 'vscode';
import * as path from 'path';
import { ExcludePattern } from './domain/ExcludePattern';
import { IFileSystem } from '../../shared/domain/IFileSystem';
import { DEFAULT_EXCLUDED_DIR_NAMES } from '../../shared/filesystem/defaultExcludes';

export interface TreeConfig {
  excludePatterns: ExcludePattern[];
  excludedDirNames: Set<string>;
  hideExcludedDirectories: boolean;
  useGitignore: boolean;
}

export class TreeConfigLoader {
  constructor(
    private readonly fileSystem: IFileSystem,
    private readonly onReload: () => void
  ) {}

  load(workspaceRoot: string | undefined): TreeConfig {
    const cfg = vscode.workspace.getConfiguration('codeprep');
    const excludes: string[] = cfg.get('exclude', []);
    const hideExcludedDirectories = cfg.get<boolean>('hideExcludedDirectories', false) ?? false;
    const useGitignore = cfg.get<boolean>('useGitignore', true) ?? true;
    const excludePatterns = this.buildPatterns(excludes, cfg.get('excludePatterns', []));
    const excludedDirNames = this.buildDirNames(excludes);

    if ((hideExcludedDirectories || useGitignore) && workspaceRoot) {
      void this.augmentWithGitignore(workspaceRoot, excludePatterns, excludedDirNames);
    }
    return { excludePatterns, excludedDirNames, hideExcludedDirectories, useGitignore };
  }

  private buildPatterns(excludes: string[], regexPatterns: string[]): ExcludePattern[] {
    return [
      ...excludes.map(p => ExcludePattern.create(p)),
      ...regexPatterns.map(p => ExcludePattern.createFromRegex(p))
    ];
  }

  private buildDirNames(excludes: string[]): Set<string> {
    const fromConfig = excludes
      .map(p => p.replace(/^\*\*\//, '').replace(/\/\*\*\/$/, '').replace(/[{}]/g, ''))
      .map(p => p.split('/').filter(Boolean)[0])
      .filter(Boolean);
    return new Set([...DEFAULT_EXCLUDED_DIR_NAMES, ...fromConfig]);
  }

  private async augmentWithGitignore(
    workspaceRoot: string,
    patterns: ExcludePattern[],
    dirNames: Set<string>
  ): Promise<void> {
    try {
      const res = await this.fileSystem.readFile(path.join(workspaceRoot, '.gitignore'));
      if (!res || (res as { isFailure?: boolean }).isFailure) return;
      const txt = (res as { value: string }).value;
      this.applyGitignoreLines(txt, patterns, dirNames);
      this.onReload();
    } catch {
      // ignore
    }
  }

  private applyGitignoreLines(txt: string, patterns: ExcludePattern[], dirNames: Set<string>): void {
    const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('!'));
    for (const line of lines) {
      const glob = line.endsWith('/')
        ? `**/${line}**`
        : (line.includes('*') || line.includes('?') ? `**/${line}` : `**/${line}/**`);
      patterns.push(ExcludePattern.create(glob));
      const name = glob.replace(/^\*\*\//, '').replace(/\/\*\*$/, '').replace(/[{}]/g, '').split('/')[0];
      if (name) dirNames.add(name);
    }
  }
}

/*
 * Copyright 2026 CodePrep Contributors
 */
import * as vscode from 'vscode';
import * as path from 'path';
import { DEFAULT_EXCLUDED_DIR_NAMES, SENSITIVE_EXCLUDED_PATTERNS } from '../../../shared/filesystem/defaultExcludes';

export const DEFAULT_GLOBS: readonly string[] = Object.freeze([
  ...DEFAULT_EXCLUDED_DIR_NAMES.map((n) => `**/${n}/**`),
  ...SENSITIVE_EXCLUDED_PATTERNS.map((p) => `**/${p}`),
]);

export class WorkspaceExcludeProvider {
  constructor(private readonly workspaceRoot: string) {}

  public async getExcludePattern(): Promise<string | undefined> {
    const config = vscode.workspace.getConfiguration('codeprep');
    const userExcludes = config.get<string[]>('exclude', []) || [];
    const useGitignore = config.get<boolean>('useGitignore', true) ?? true;

    const gitignorePatterns = useGitignore ? await this.readGitignorePatterns() : [];
    const all = Array.from(new Set([...DEFAULT_GLOBS, ...userExcludes, ...gitignorePatterns].filter(Boolean)));
    if (all.length === 0) return undefined;
    if (all.length === 1) return all[0];
    return `{${all.join(',')}}`;
  }

  private async readGitignorePatterns(): Promise<string[]> {
    try {
      const gitignoreUri = vscode.Uri.file(path.join(this.workspaceRoot, '.gitignore'));
      const buf = await vscode.workspace.fs.readFile(gitignoreUri);
      return parseGitignoreToGlobs(new TextDecoder().decode(buf));
    } catch {
      return [];
    }
  }
}

export function parseGitignoreToGlobs(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('!'))
    .map(formatGitignoreLine);
}

function formatGitignoreLine(pattern: string): string {
  if (pattern.endsWith('/')) return `**/${pattern}**`;
  if (pattern.includes('*') || pattern.includes('?')) return `**/${pattern}`;
  return `**/${pattern}/**`;
}

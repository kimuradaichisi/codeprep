/*
 * Copyright 2026 CodePrep Contributors
 */
import * as vscode from 'vscode';
import { t } from '../../../utils/i18n';
import { Selection } from '../domain/Selection';
import { PathService } from '../domain/PathService';
import { PathValidator } from '../../../shared/domain/PathValidator';

export class ClipboardSelectionUseCase {
  constructor(
    private readonly selection: Selection,
    private readonly root: string | undefined
  ) { }

  public async selectFromClipboard(): Promise<void> {
    if (!this.isEnabled()) return;
    const text = await vscode.env.clipboard.readText();
    const clipPaths = this.extractPaths(text);
    if (clipPaths.length === 0) {
      vscode.window.showWarningMessage(t('noProjectPathsInClipboard'));
      return;
    }
    const resolved = await this.resolvePaths(clipPaths);
    if (resolved.length === 0) return;
    const allPaths = PathService.deriveAllPaths(resolved);
    this.selection.addAll(allPaths);
    this.notify(t('codeprepSelectedFiles', String(resolved.length)));
  }

  private isEnabled(): boolean {
    const config = vscode.workspace.getConfiguration('codeprep');
    return config.get<boolean>('clipboard.watch.enabled', true);
  }

  private notify(message: string): void {
    if (!this.isEnabled()) return;
    vscode.window.showInformationMessage(message);
  }

  private async resolvePaths(clipPaths: readonly string[]): Promise<string[]> {
    const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**');
    const projectFiles = files.map(uri => vscode.workspace.asRelativePath(uri, false).replace(/\\/g, '/'));
    const resolved: string[] = [];
    for (const clipPath of clipPaths) {
      const match = this.matchFile(clipPath, projectFiles);
      if (match) resolved.push(match);
    }
    return resolved;
  }

  private matchFile(clipPath: string, files: readonly string[]): string | undefined {
    const normalized = clipPath.toLowerCase().replace(/^\/+/, '');
    const exact = files.find(f => f.toLowerCase() === normalized);
    if (exact) return exact;

    const suffix = files.filter(f => f.toLowerCase().endsWith(normalized) || normalized.endsWith(f.toLowerCase()));
    if (suffix.length === 1) return suffix[0];

    const segments = normalized.split('/');
    if (segments.length >= 2) return this.bestSegmentMatch(segments, files);
    return undefined;
  }

  private bestSegmentMatch(segments: readonly string[], files: readonly string[]): string | undefined {
    let best: string | undefined;
    let max = 0;
    for (const f of files) {
      const matchCount = this.countMatchingSegments(segments, f.toLowerCase().split('/'));
      if (matchCount >= 2 && matchCount > max) {
        max = matchCount;
        best = f;
      } else if (matchCount >= 2 && matchCount === max) {
        best = undefined;
      }
    }
    return best;
  }

  private countMatchingSegments(clip: readonly string[], rel: readonly string[]): number {
    let count = 0;
    const min = Math.min(clip.length, rel.length);
    for (let i = 1; i <= min; i++) {
      if (clip[clip.length - i] === rel[rel.length - i]) count++;
      else break;
    }
    return count;
  }

  private extractPaths(text: string): string[] {
    const regex = /(([a-zA-Z]:\\|(?:\.\/|\/))?[a-z0-9_./\\-]+\.[a-z0-9]+)/gi;
    const matches = text.match(regex) || [];
    const paths = new Set<string>();
    for (const match of matches) {
      const cleaned = match.replace(/^['"`]+|['"`]+$/g, '').replace(/:\d+(:\d+)?$/, '').replace(/\\/g, '/').trim();
      if (cleaned && cleaned.includes('.') && PathValidator.isValidClipboardPath(cleaned)) {
        paths.add(cleaned);
      }
    }
    return Array.from(paths);
  }
}
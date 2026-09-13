/*
 * Copyright 2026 CodePrep Contributors
 */
import * as vscode from 'vscode';
import { t } from '../../../utils/i18n';
import { Selection } from '../domain/Selection';
import { PathService } from '../domain/PathService';
import { PathValidator } from '../../../shared/domain/PathValidator';
import { WorkspacePathResolver } from './WorkspacePathResolver';

export class ClipboardSelectionUseCase {
  constructor(
    private readonly selection: Selection,
    private readonly resolver: WorkspacePathResolver
  ) { }

  public async selectFromClipboard(): Promise<void> {
    if (!this.isEnabled()) return;
    const text = await vscode.env.clipboard.readText();
    const clipPaths = this.extractPaths(text);
    if (clipPaths.length === 0) {
      vscode.window.showWarningMessage(t('noProjectPathsInClipboard'));
      return;
    }
    const resolved = await this.resolver.resolve(clipPaths);
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
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

    const paths = this.extractPaths(text);

    if (paths.length === 0) {
      vscode.window.showWarningMessage(t('noProjectPathsInClipboard'));
      return;
    }

    const allPaths = PathService.deriveAllPaths(paths);
    this.selection.addAll(allPaths);
    this.notify(t('codeprepSelectedFiles', String(paths.length)));
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
    const resolved = matches.map(p => this.normalizeToRelative(p));

    return Array.from(new Set(resolved)).filter(p => PathValidator.isValidClipboardPath(p));
  }

  private normalizeToRelative(p: string): string {
    const normPath = p.replace(/\\/g, '/');
    const normRoot = this.root ? this.root.replace(/\\/g, '/') : '';

    if (normRoot && normPath.toLowerCase().includes(normRoot.toLowerCase())) {
      const index = normPath.toLowerCase().indexOf(normRoot.toLowerCase());
      return normPath.substring(index + normRoot.length).replace(/^\//, '');
    }

    return normPath.replace(/^[a-zA-Z]:\//, '');
  }
}
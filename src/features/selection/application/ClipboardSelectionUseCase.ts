/*
 * Copyright 2026 CodePrep Contributors
 */
import * as vscode from 'vscode';
import { Selection } from '../domain/Selection';
import { PathService } from '../domain/PathService';
import { PathValidator } from '../../../shared/domain/PathValidator';

export class ClipboardSelectionUseCase {
  constructor(
    private readonly selection: Selection,
    private readonly root: string | undefined
  ) {}

  public async selectFromClipboard(): Promise<void> {
    const text = await vscode.env.clipboard.readText();
    console.log('DEBUG: clipboard text:', text);  // 追加

    const paths = this.extractPaths(text);
    console.log('DEBUG: extracted paths:', paths);  // 追加

    if (paths.length === 0) {
      vscode.window.showWarningMessage('No project-related paths found in clipboard.');
      console.log('DEBUG: no paths, returning early');  // 追加
      return;
    }

    const allPaths = PathService.deriveAllPaths(paths);
    console.log('DEBUG: allPaths with parents:', allPaths);  // 追加

    this.selection.addAll(allPaths);
    console.log('DEBUG: selection after addAll:', this.selection.getPaths());  // 追加

    vscode.window.showInformationMessage(`CodePrep: Selected ${paths.length} files.`);
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
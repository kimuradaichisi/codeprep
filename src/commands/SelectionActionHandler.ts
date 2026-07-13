/*
 * Copyright 2026 CodePrep Contributors
 */
import * as vscode from 'vscode';
import { t } from '../utils/i18n';
import { SelectionUseCase } from '../features/selection/application/SelectionUseCase';
import { UIController } from '../features/ui/application/UIController';
import { VSCodeWorkspaceRepository } from '../features/selection/infrastructure/VSCodeWorkspaceRepository';
import { IGitClient } from '../features/git/domain/IGitClient';
import { ISearchRepository } from '../features/selection/domain/ISearchRepository';
import { ClipboardSelectionUseCase } from '../features/selection/application/ClipboardSelectionUseCase';
import { PathService } from '../features/selection/domain/PathService';

export interface SelectionActionDeps {
  useCase: SelectionUseCase;
  ui: UIController;
  repo: VSCodeWorkspaceRepository;
  searchRepo: ISearchRepository;
  gitClient: IGitClient;
  root: string | undefined;
}

export class SelectionActionHandler {
  private readonly clipboardUseCase: ClipboardSelectionUseCase;

  constructor(private readonly deps: SelectionActionDeps) {
    this.clipboardUseCase = new ClipboardSelectionUseCase(deps.useCase.currentSelection, deps.root);
  }

  async selectAll(): Promise<void> {
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'CodePrep: 全選択中...' },
      async () => { await this.deps.useCase.selectAll(this.deps.repo); await this.deps.ui.refresh(); }
    );
  }

  async clearAll(): Promise<void> {
    this.deps.useCase.currentSelection.clear();
    await this.deps.ui.refresh();
  }

  async invert(): Promise<void> {
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'CodePrep: 選択を反転中...' },
      async () => { await this.deps.useCase.invertSelection(this.deps.repo); await this.deps.ui.refresh(); }
    );
  }

  async selectModified(): Promise<void> {
    if (!this.deps.root) return;
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'CodePrep: Git変更を抽出中...' },
      async () => { await this.deps.useCase.selectModifiedFiles(this.deps.gitClient, this.deps.root!, false); await this.deps.ui.refresh(); }
    );
  }

  async selectFromClipboard(): Promise<void> {
    await this.clipboardUseCase.selectFromClipboard();
    await this.deps.ui.refresh();
  }

  async selectDirectories(): Promise<void> {
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'CodePrep: ディレクトリ構造を抽出中...' },
      async () => {
        const allFiles = await this.deps.repo.getAllFiles();
        const directories = PathService.deriveAllPaths(allFiles).filter(p => !allFiles.includes(p));
        this.deps.useCase.currentSelection.clear();
        this.deps.useCase.currentSelection.addAll(directories);
        await this.deps.ui.refresh();
      }
    );
  }

  async selectByGrep(): Promise<void> {
    const q = await vscode.window.showInputBox({ placeHolder: 'キーワード', prompt: '内容にキーワードを含むファイルを抽出' });
    if (q) await this.runGrepSearch(q);
  }

  async selectByExtension(): Promise<void> {
    const input = await vscode.window.showInputBox({ placeHolder: 'ts,js,tsx', prompt: t('selection.enterExtensionsRegex') });
    if (!input) return;
    const patterns = this.parseExtensionPatterns(input);
    if (!patterns) return;
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: `CodePrep: ${t('command.selectByExtension')}...` },
      async () => {
        const allFiles = await this.deps.repo.getAllFiles();
        const matched = allFiles.filter(f => patterns.some(r => r.test((f.split('.').pop() || '').toLowerCase())));
        this.deps.useCase.currentSelection.clear();
        this.deps.useCase.currentSelection.addAll(PathService.deriveAllPaths(matched));
        await this.deps.ui.refresh();
        vscode.window.showInformationMessage(t('filesAdded', String(matched.length)));
      }
    );
  }

  private parseExtensionPatterns(input: string): RegExp[] | null {
    const parts = input.split(',').map(s => s.trim()).filter(Boolean);
    const patterns: RegExp[] = [];
    for (const p of parts) {
      if (p.length > 500) { vscode.window.showErrorMessage(t('selection.invalidRegex', p)); return null; }
      try { patterns.push(new RegExp(p, 'i')); }
      catch { vscode.window.showErrorMessage(t('selection.invalidRegex', p)); return null; }
    }
    return patterns;
  }

  private async runGrepSearch(query: string): Promise<void> {
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: `CodePrep: "${query}" を検索中...` },
      async () => {
        try {
          const count = await this.deps.useCase.selectByGrep(this.deps.searchRepo, query);
          await this.deps.ui.refresh();
          vscode.window.showInformationMessage(t('filesAdded', String(count)));
        } catch (e) {
          vscode.window.showErrorMessage(t('searchFailed', e instanceof Error ? e.message : String(e)));
        }
      }
    );
  }
}

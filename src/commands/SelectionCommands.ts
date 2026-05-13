/*
 * Copyright 2026 CodePrep Contributors
 */
import * as vscode from 'vscode';
import { SelectionUseCase } from '../features/selection/application/SelectionUseCase';
import { UIController } from '../features/ui/application/UIController';
import { VSCodeWorkspaceRepository } from '../features/selection/infrastructure/VSCodeWorkspaceRepository';
import { ISearchRepository } from '../features/selection/domain/ISearchRepository';
import { IGitClient } from '../features/git/domain/IGitClient';
import { SelectionOptionsUseCase } from '../features/selection/application/SelectionOptionsUseCase';
import { ClipboardSelectionUseCase } from '../features/selection/application/ClipboardSelectionUseCase';
import { PathService } from '../features/selection/domain/PathService';

interface SelectionQuickPickItem extends vscode.QuickPickItem { id: string; }

export interface SelectionCommandsDeps {
  useCase: SelectionUseCase; ui: UIController;
  repo: VSCodeWorkspaceRepository; searchRepo: ISearchRepository;
  gitClient: IGitClient; root: string | undefined;
}

export class SelectionCommands {
  private readonly optionsUseCase = new SelectionOptionsUseCase();
  private readonly clipboardUseCase: ClipboardSelectionUseCase;

  constructor(private readonly deps: SelectionCommandsDeps) {
    this.clipboardUseCase = new ClipboardSelectionUseCase(
      deps.useCase.currentSelection,
      deps.root
    );
  }

  async showSelectionMenu(): Promise<void> {
    const items: SelectionQuickPickItem[] = [
      { label: "$(check-all) Select All", id: 'all' },
      { label: "$(clippy) Select from Clipboard", id: 'clip', description: 'クリップボードのパスから選択' },
      { label: "$(search) Select by Grep", id: 'grep' },
      { label: "$(file-directory) Select Directories Only", id: 'dirs' },
      { label: "$(git-compare) Select Modified Files (Git)", id: 'git' },
      { label: "$(reply) Invert Selection", id: 'invert' },
      { label: "$(trash) Clear All", id: 'clear' }
    ];
    const s = await vscode.window.showQuickPick(items, { placeHolder: '選択アクションを選択' });
    if (s) await this.runSelectionAction(s.id);
  }

  public async runSelectionAction(id: string): Promise<void> {
    if (id === 'all') await this.selectAll();
    else if (id === 'clip') await this.selectFromClipboard();
    else if (id === 'grep') await this.selectByGrep();
    else if (id === 'dirs') await this.selectDirectories();
    else if (id === 'git') await this.selectModified();
    else if (id === 'invert') await this.invert();
    else if (id === 'clear') await this.clearAll();
  }

  public async selectDirectories() {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification, title: "CodePrep: ディレクトリ構造を抽出中..."
    }, async () => {
      const allFiles = await this.deps.repo.getAllFiles();
      const allPaths = PathService.deriveAllPaths(allFiles);
      const directories = allPaths.filter(p => !allFiles.includes(p));
      this.deps.useCase.currentSelection.clear();
      this.deps.useCase.currentSelection.addAll(directories);
      await this.deps.ui.refresh();
    });
  }

  public async selectFromClipboard() {
    await this.clipboardUseCase.selectFromClipboard();
    await this.deps.ui.refresh();
  }

  public async selectAll() {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification, title: "CodePrep: 全選択中..."
    }, async () => {
      await this.deps.useCase.selectAll(this.deps.repo);
      await this.deps.ui.refresh();
    });
  }

  public async clearAll() {
    this.deps.useCase.currentSelection.clear();
    await this.deps.ui.refresh();
  }

  public async invert() {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification, title: "CodePrep: 選択を反転中..."
    }, async () => {
      await this.deps.useCase.invertSelection(this.deps.repo);
      await this.deps.ui.refresh();
    });
  }

  public async selectModified() {
    if (!this.deps.root) return;
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification, title: "CodePrep: Git変更を抽出中..."
    }, async () => {
      await this.deps.useCase.selectModifiedFiles(this.deps.gitClient, this.deps.root!, false);
      await this.deps.ui.refresh();
    });
  }

  public async selectByGrep() {
    const q = await vscode.window.showInputBox({
      placeHolder: 'キーワード', prompt: '内容にキーワードを含むファイルを抽出'
    });
    if (q) await this.runGrepSearch(q);
  }

  private async runGrepSearch(query: string): Promise<void> {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification, title: `CodePrep: "${query}" を検索中...`
    }, async () => {
      try {
        const count = await this.deps.useCase.selectByGrep(this.deps.searchRepo, query);
        await this.deps.ui.refresh();
        vscode.window.showInformationMessage(`CodePrep: ${count} 個のファイルを追加しました。`);
      } catch (e) {
        vscode.window.showErrorMessage(`検索に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
      }
    });
  }

  public async showPresetMenu() {
    const items = [{ label: "$(save) Save Preset", id: 'save' }, { label: "$(folder-opened) Load Preset", id: 'load' }];
    const s = await vscode.window.showQuickPick(items, { placeHolder: 'プリセット管理' });
    if (s?.id === 'save') await this.savePreset();
    if (s?.id === 'load') await this.loadPreset();
  }

  public async savePreset() {
    const name = await vscode.window.showInputBox({ placeHolder: 'プリセット名を入力' });
    if (name) await this.deps.useCase.savePreset(name);
  }

  public async loadPreset() {
    const selected = await vscode.window.showQuickPick(this.deps.useCase.getPresetList());
    if (selected) {
      await this.deps.useCase.loadPreset(selected);
      await this.deps.ui.refresh();
    }
  }

  public async configureGenerationOptions(): Promise<void> {
    await this.optionsUseCase.configureOptions();
  }
}
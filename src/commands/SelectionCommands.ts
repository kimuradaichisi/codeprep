import * as vscode from 'vscode';
import { SelectionUseCase } from '../features/selection/application/SelectionUseCase';
import { UIController } from '../features/ui/application/UIController';
import { VSCodeWorkspaceRepository } from '../features/selection/infrastructure/VSCodeWorkspaceRepository';
import { ISearchRepository } from '../features/selection/domain/ISearchRepository';
import { GitUtils } from '../utils/git';

export class SelectionCommands {
  constructor(
    private useCase: SelectionUseCase,
    private ui: UIController,
    private repo: VSCodeWorkspaceRepository,
    private searchRepo: ISearchRepository,
    private root: string | undefined
  ) {}

  /**
   * 選択系アクションメニューを表示
   */
  async showSelectionMenu() {
    const items = [
      { label: "$(check-all) Select All", id: 'all' },
      { label: "$(search) Select by Grep", id: 'grep' },
      { label: "$(git-compare) Select Modified Files (Git)", id: 'git' },
      { label: "$(reply) Invert Selection", id: 'invert' },
      { label: "$(trash) Clear All", id: 'clear' }
    ];
    const selected = await vscode.window.showQuickPick(items, { placeHolder: '選択アクションを選択' });
    if (selected) await this.runSelectionAction(selected.id);
  }

  public async runSelectionAction(id: string) {
    if (id === 'all') await this.selectAll();
    else if (id === 'grep') await this.selectByGrep();
    else if (id === 'git') await this.selectModified();
    else if (id === 'invert') await this.invert();
    else if (id === 'clear') await this.clearAll();
  }

  public async selectAll() {
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "CodePrep: 全選択中..." }, async () => {
      await this.useCase.selectAll(this.repo);
      await this.ui.refresh();
    });
  }

  public async clearAll() {
    this.useCase.currentSelection.clear();
    await this.ui.refresh();
  }

  public async invert() {
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "CodePrep: 選択を反転中..." }, async () => {
      await this.useCase.invertSelection(this.repo);
      await this.ui.refresh();
    });
  }

  public async selectModified() {
    if (!this.root) return;
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "CodePrep: Git変更を抽出中..." }, async () => {
      await this.useCase.selectModifiedFiles(GitUtils, this.root!, false);
      await this.ui.refresh();
    });
  }

  public async selectByGrep() {
    const q = await vscode.window.showInputBox({ placeHolder: 'キーワードを入力', prompt: '内容にキーワードを含むファイルを抽出します' });
    if (!q) return;
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: `CodePrep: "${q}" を検索中...` }, async () => {
      const count = await this.useCase.selectByGrep(this.searchRepo, q);
      await this.ui.refresh();
      vscode.window.showInformationMessage(`CodePrep: ${count} 個のファイルを追加しました。`);
    });
  }

  public async showPresetMenu() {
    const items = [{ label: "$(save) Save Preset", id: 'save' }, { label: "$(folder-opened) Load Preset", id: 'load' }];
    const selected = await vscode.window.showQuickPick(items, { placeHolder: 'プリセット管理' });
    if (selected?.id === 'save') await this.savePreset();
    if (selected?.id === 'load') await this.loadPreset();
  }

  public async savePreset() {
    const name = await vscode.window.showInputBox({ placeHolder: 'プリセット名を入力' });
    if (name) await this.useCase.savePreset(name);
  }

  public async loadPreset() {
    const selected = await vscode.window.showQuickPick(this.useCase.getPresetList());
    if (selected) {
      await this.useCase.loadPreset(selected);
      await this.ui.refresh();
    }
  }
}
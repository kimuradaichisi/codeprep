/*
 * Copyright 2026 CodePrep Contributors
 */
import * as vscode from 'vscode';
import { t } from '../utils/i18n';
import { SelectionUseCase } from '../features/selection/application/SelectionUseCase';
import { UIController } from '../features/ui/application/UIController';
import { VSCodeWorkspaceRepository } from '../features/selection/infrastructure/VSCodeWorkspaceRepository';
import { ISearchRepository } from '../features/selection/domain/ISearchRepository';
import { IGitClient } from '../features/git/domain/IGitClient';
import { SelectionOptionsUseCase } from '../features/selection/application/SelectionOptionsUseCase';
import { SelectionActionHandler } from './SelectionActionHandler';

interface SelectionQuickPickItem extends vscode.QuickPickItem { id: string; }

export interface SelectionCommandsDeps {
  useCase: SelectionUseCase; ui: UIController;
  repo: VSCodeWorkspaceRepository; searchRepo: ISearchRepository;
  gitClient: IGitClient; root: string | undefined;
}

export class SelectionCommands {
  private readonly optionsUseCase = new SelectionOptionsUseCase();
  private readonly actionHandler: SelectionActionHandler;

  constructor(private readonly deps: SelectionCommandsDeps) {
    this.actionHandler = new SelectionActionHandler(deps);
  }

  async showSelectionMenu(): Promise<void> {
    const items: SelectionQuickPickItem[] = [
      { label: `$(check-all) ${t('command.selectAll')}`, id: 'all' },
      { label: `$(clippy) ${t('command.selectFromClipboard')}`, id: 'clip', description: t('selection.clipboardDescription') },
      { label: `$(search) ${t('command.selectByGrep')}`, id: 'grep' },
      { label: `$(file) ${t('command.selectByExtension')}`, id: 'ext', description: t('selection.extensionDescription') },
      { label: `$(file-directory) ${t('command.selectDirectories')}`, id: 'dirs' },
      { label: `$(git-compare) ${t('command.selectGitDiff')}`, id: 'git' },
      { label: `$(reply) ${t('command.invertSelection')}`, id: 'invert' },
      { label: `$(trash) ${t('command.clearAll')}`, id: 'clear' }
    ];
    const s = await vscode.window.showQuickPick(items, { placeHolder: '選択アクションを選択' });
    if (s) await this.runSelectionAction(s.id);
  }

  public async runSelectionAction(id: string): Promise<void> {
    if (id === 'all') await this.selectAll();
    else if (id === 'clip') await this.selectFromClipboard();
    else if (id === 'grep') await this.selectByGrep();
    else if (id === 'dirs') await this.selectDirectories();
    else if (id === 'ext') await this.selectByExtension();
    else if (id === 'git') await this.selectModified();
    else if (id === 'invert') await this.invert();
    else if (id === 'clear') await this.clearAll();
  }

  public async selectAll(): Promise<void> { await this.actionHandler.selectAll(); }
  public async clearAll(): Promise<void> { await this.actionHandler.clearAll(); }
  public async invert(): Promise<void> { await this.actionHandler.invert(); }
  public async selectModified(): Promise<void> { await this.actionHandler.selectModified(); }
  public async selectByGrep(): Promise<void> { await this.actionHandler.selectByGrep(); }
  public async selectByExtension(): Promise<void> { await this.actionHandler.selectByExtension(); }
  public async selectFromClipboard(): Promise<void> { await this.actionHandler.selectFromClipboard(); }
  public async selectDirectories(): Promise<void> { await this.actionHandler.selectDirectories(); }

  public async showPresetMenu(): Promise<void> {
    const items = [
      { label: `$(save) ${t('command.savePreset')}`, id: 'save' },
      { label: `$(folder-opened) ${t('command.loadPreset')}`, id: 'load' }
    ];
    const s = await vscode.window.showQuickPick(items, { placeHolder: 'プリセット管理' });
    if (s?.id === 'save') await this.savePreset();
    if (s?.id === 'load') await this.loadPreset();
  }

  public async savePreset(): Promise<void> {
    const name = await vscode.window.showInputBox({ placeHolder: 'プリセット名を入力' });
    if (name) await this.deps.useCase.savePreset(name);
  }

  public async loadPreset(): Promise<void> {
    const selected = await vscode.window.showQuickPick(this.deps.useCase.getPresetList());
    if (selected) { await this.deps.useCase.loadPreset(selected); await this.deps.ui.refresh(); }
  }

  public async configureGenerationOptions(): Promise<void> {
    await this.optionsUseCase.configureOptions();
  }
}
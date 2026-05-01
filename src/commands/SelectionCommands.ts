import * as vscode from 'vscode';
import { SelectionUseCase } from '../features/selection/application/SelectionUseCase';
import { UIController } from '../features/ui/application/UIController';
import { VSCodeWorkspaceRepository } from '../features/selection/infrastructure/VSCodeWorkspaceRepository';

export class SelectionCommands {
  constructor(
    private useCase: SelectionUseCase,
    private ui: UIController,
    private repo: VSCodeWorkspaceRepository
  ) {}

  async selectAll() {
    await vscode.window.withProgress({ 
      location: vscode.ProgressLocation.Notification, 
      title: "CodePrep: 全選択中..." 
    }, async () => {
      await this.useCase.selectAll(this.repo);
      await this.ui.refresh();
    });
  }

  async clearAll() {
    this.useCase.currentSelection.clear();
    await this.ui.refresh();
  }

  async invert() {
    await vscode.window.withProgress({ 
      location: vscode.ProgressLocation.Notification, 
      title: "CodePrep: 反転中..." 
    }, async () => {
      await this.useCase.invertSelection(this.repo);
      await this.ui.refresh();
    });
  }

  async savePreset() {
    const name = await vscode.window.showInputBox({ placeHolder: 'プリセット名を入力' });
    if (name) {
      await this.useCase.savePreset(name);
      vscode.window.showInformationMessage(`Preset "${name}" saved.`);
    }
  }

  async loadPreset() {
    const presets = this.useCase.getPresetList();
    const selected = await vscode.window.showQuickPick(presets);
    if (selected) {
      await this.useCase.loadPreset(selected);
      await this.ui.refresh();
    }
  }
}
import * as vscode from 'vscode';
import { SelectionUseCase } from '../features/selection/application/SelectionUseCase';
import { UIController } from '../features/ui/application/UIController';
import { GitUtils } from '../utils/git';

export class GitCommands {
  constructor(
    private useCase: SelectionUseCase,
    private ui: UIController,
    private root: string | undefined
  ) {}

  async showMenu() {
    if (!this.root) return;
    const items = [
      { label: "$(file-diff) Select Modified Files", id: 'mod' },
      { label: "$(beaker) Select Modified + Related Tests", id: 'tests' },
      { label: "$(git-commit) Copy Commit Message Prompt", id: 'commit' }
    ];
    const selected = await vscode.window.showQuickPick(items, { placeHolder: 'Gitアクションを選択' });
    if (!selected) return;

    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: `CodePrep: ${selected.label}` }, async () => {
      if (selected.id === 'mod' || selected.id === 'tests') {
        await this.useCase.selectModifiedFiles(GitUtils, this.root!, selected.id === 'tests');
        await this.ui.refresh();
      } else if (selected.id === 'commit') {
        const diff = await GitUtils.getDiff(this.root!);
        if (!diff) return;
        await vscode.env.clipboard.writeText(`以下のdiffからコミットメッセージを作成してください。\n\n${diff}`);
        vscode.window.showInformationMessage('プロンプトをコピーしました。');
      }
    });
  }
}
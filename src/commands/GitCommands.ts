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
    if (selected) await this.executeAction(selected.id, selected.label);
  }

  private async executeAction(id: string, label: string) {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `CodePrep: ${label}`
    }, async () => {
      if (id === 'commit') return this.copyCommitPrompt();
      await this.useCase.selectModifiedFiles(GitUtils, this.root!, id === 'tests');
      await this.ui.refresh();
    });
  }

  private async copyCommitPrompt() {
    const diff = await GitUtils.getDiff(this.root || '', ['package.json', 'package-lock.json']);
    if (!diff) return vscode.window.showInformationMessage('差分がありません。');
    
    const config = vscode.workspace.getConfiguration('codeprep');
    const template = config.get<string>('gitCommitPrompt', '');
    const prompt = template.replace(/{{diff}}/g, diff);
    
    await vscode.env.clipboard.writeText(prompt);
    
    if (config.get('openAfterGitAction', true)) {
      const doc = await vscode.workspace.openTextDocument({ content: prompt, language: 'markdown' });
      // 修正: vscode.ViewColumn.Beside を使用
      await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Beside });
    }
    
    vscode.window.showInformationMessage('プロンプトをコピーしました。');
  }
}
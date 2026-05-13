import * as vscode from 'vscode';
import { SelectionUseCase } from '../features/selection/application/SelectionUseCase';
import { UIController } from '../features/ui/application/UIController';
import { IGitClient } from '../features/git/domain/IGitClient';
import { t } from '../utils/i18n';

export class GitCommands {
  constructor(
    private useCase: SelectionUseCase,
    private ui: UIController,
    private gitClient: IGitClient,
    private root: string | undefined
  ) { }

  async showMenu() {
    if (!this.root) return;
    const items: QuickPickItem[] = [
      { label: `$(file-diff) ${t('command.selectModifiedFiles')}`, id: 'mod' },
      { label: `$(beaker) ${t('command.selectModifiedTests')}`, id: 'tests' },
      { label: `$(git-commit) ${t('command.copyCommitPrompt')}`, id: 'commit' }
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
      await this.useCase.selectModifiedFiles(this.gitClient, this.root!, id === 'tests');
      await this.ui.refresh();
    });
  }

  private async copyCommitPrompt() {
    const result = await this.gitClient.getDiff(this.root || '', ['package.json', 'package-lock.json']);
    if (result.isFailure || !result.value) return vscode.window.showInformationMessage(t('noDiffs'));

    const diff = result.value;
    const config = vscode.workspace.getConfiguration('codeprep');
    const template = config.get<string>('gitCommitPrompt', '');
    const prompt = template.replace(/{{diff}}/g, diff);

    await vscode.env.clipboard.writeText(prompt);
    await this.openCommitPromptEditor(prompt, config);

    vscode.window.showInformationMessage(t('promptCopied'));
  }

  private async openCommitPromptEditor(prompt: string, config: vscode.WorkspaceConfiguration) {
    if (!config.get('openAfterGitAction', true)) return;

    const uri = vscode.Uri.parse('untitled:Commit Message.md');
    try {
      const doc = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Beside });
      await editor.edit(eb => {
        const range = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
        eb.replace(range, prompt);
      });
    } catch {
      const doc = await vscode.workspace.openTextDocument({ content: prompt, language: 'markdown' });
      await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Beside });
    }
  }
}

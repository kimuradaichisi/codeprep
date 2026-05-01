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
    const diff = await GitUtils.getDiff(this.root!);
    if (!diff) return vscode.window.showInformationMessage('差分がありません。');
    
    const prompt = `以下のgit diffに基づき、コミットメッセージを提案してください。

## ルール
- Conventional Commits 規約に従ってください。
- フォーマット: <type>(<scope>): <subject>
- 1行目は要約、3行目以降に具体的な変更内容を箇条書きで記載してください。
- 言語は日本語で出力してください。

## type の定義
- feat: 新機能
- fix: バグ修正
- refactor: 機能変更を伴わないコード整理
- perf: パフォーマンス向上
- test: テストの追加・修正
- chore: ビルド構成や依存関係の変更、ドキュメント生成など

## git diff
${diff}`;
    await vscode.env.clipboard.writeText(prompt);
    
    const config = vscode.workspace.getConfiguration('codeprep');
    if (config.get('openAfterGitAction', true)) {
      const doc = await vscode.workspace.openTextDocument({ content: prompt, language: 'markdown' });
      // 修正: vscode.ViewColumn.Beside を使用
      await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Beside });
    }
    
    vscode.window.showInformationMessage('プロンプトをコピーしました。');
  }
}
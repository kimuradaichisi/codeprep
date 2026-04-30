import * as vscode from 'vscode';
import { ITokenPresenter } from '../domain/ITokenPresenter';
import { TokenStatistics } from '../domain/TokenStatistics';

/**
 * VSCode のステータスバーを使用して統計情報を表示するアダプター
 */
export class VSCodeStatusBarPresenter implements ITokenPresenter {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.command = 'codeprep.clearAll';
  }

  public present(stats: TokenStatistics, limit: number): void {
    const tokens = stats.estimatedTokens;
    const tokenStr = tokens.toString();

    this.statusBarItem.text = `$(file-code) ${stats.fileCount} files / ~${tokenStr} tokens`;
    
    if (tokens.isExceeding(limit)) {
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      this.statusBarItem.tooltip = `WARNING: Token count (~${tokenStr}) exceeds limit (${limit / 1000}k)!\nTotal Characters: ${stats.totalCharacters}`;
    } else {
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.tooltip = `Total Characters: ${stats.totalCharacters}\nEstimated Tokens (Base: 4 chars/token)`;
    }
    
    this.statusBarItem.show();
  }

  public clear(): void {
    this.statusBarItem.hide();
  }

  public dispose(): void {
    this.statusBarItem.dispose();
  }
}

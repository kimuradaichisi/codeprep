import * as vscode from 'vscode';
import { ITokenPresenter } from '../domain/ITokenPresenter';
import { TokenStatistics } from '../domain/TokenStatistics';
import { t } from '../../../utils/i18n';

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

    this.statusBarItem.text = `$(file-code) ${t('statusbar.text', String(stats.fileCount), tokenStr)}`;

    if (tokens.isExceeding(limit)) {
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      this.statusBarItem.tooltip = t('statusbar.warning', tokenStr, String(limit / 1000), String(stats.totalCharacters));
    } else {
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.tooltip = t('statusbar.totalChars', String(stats.totalCharacters));
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

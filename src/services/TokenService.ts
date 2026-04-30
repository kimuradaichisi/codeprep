import * as vscode from 'vscode';

/**
 * ファイルの統計情報と推定トークン数を計算するサービス。
 */
export class TokenService {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'codeprep.clearAll'; // 暫定的にクリアコマンドを割り当て
    }

    /**
     * 選択されたファイルのリストから統計情報を更新し、ステータスバーに表示します。
     * @param files ファイル情報の配列 (パスとサイズ)
     */
    public updateStatistics(files: { path: string; size: number }[]): void {
        const fileCount = files.length;
        let totalChars = 0;

        for (const file of files) {
            totalChars += file.size;
        }

        // 簡易ロジック: 4文字 ≒ 1トークン
        const estimatedTokens = Math.ceil(totalChars / 4);
        const config = vscode.workspace.getConfiguration('codeprep');
        const tokenLimit = config.get<number>('tokenLimit', 100000);

        const tokenStr = estimatedTokens >= 1000 
            ? `${(estimatedTokens / 1000).toFixed(1)}k` 
            : estimatedTokens.toString();

        this.statusBarItem.text = `$(file-code) ${fileCount} files / ~${tokenStr} tokens`;
        
        // 閾値チェック
        if (estimatedTokens > tokenLimit) {
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            this.statusBarItem.tooltip = `WARNING: Token count (~${tokenStr}) exceeds limit (${tokenLimit / 1000}k)!
Total Characters: ${totalChars}`;
        } else {
            this.statusBarItem.backgroundColor = undefined;
            this.statusBarItem.tooltip = `Total Characters: ${totalChars}
Estimated Tokens (Base: 4 chars/token)`;
        }
        
        if (fileCount > 0) {
            this.statusBarItem.show();
        } else {
            this.statusBarItem.hide();
        }
    }

    public dispose(): void {
        this.statusBarItem.dispose();
    }
}

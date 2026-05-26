import * as vscode from 'vscode';

/**
 * 生成された出力をプレビューするための仮想ドキュメントプロバイダー。
 */
export class PreviewProvider implements vscode.TextDocumentContentProvider {
    public static readonly scheme = 'codeprep-preview';
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    private content: string = '';

    readonly onDidChange = this._onDidChange.event;

    /**
     * 表示するコンテンツを更新し、プレビュー画面をリフレッシュします。
     */
    public update(uri: vscode.Uri, content: string) {
        this.content = content;
        this._onDidChange.fire(uri);
    }

    /**
     * VSCodeがURIを読み込む際に呼び出されます。
     */
    public provideTextDocumentContent(): string {
        return this.content;
    }
}

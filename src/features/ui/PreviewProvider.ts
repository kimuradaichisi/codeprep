/*
 * Copyright 2026 CodePrep Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
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

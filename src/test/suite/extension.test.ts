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
import * as assert from 'assert';
import * as vscode from 'vscode';
import { FileTreeProvider } from '../../providers/FileTreeProvider';
import { SelectionService } from '../../services/SelectionService';

suite('Extension Test Suite', function() {
    this.timeout(10000); // スイート全体のタイムアウトを10秒に設定

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('codeprep.codeprep-vscode'));
    });

    test('Commands should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('codeprep.generate'));
        assert.ok(commands.includes('codeprep.selectAll'));
    });

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    test('Output Format Configuration: markdown', async () => {
        const config = vscode.workspace.getConfiguration('codeprep');
        await config.update('outputFormat', 'markdown', vscode.ConfigurationTarget.Global);
        await sleep(1000);
        assert.strictEqual(vscode.workspace.getConfiguration('codeprep').get('outputFormat'), 'markdown');
    });

    test('Output Format Configuration: xml', async () => {
        const config = vscode.workspace.getConfiguration('codeprep');
        await config.update('outputFormat', 'xml', vscode.ConfigurationTarget.Global);
        await sleep(1000);
        assert.strictEqual(vscode.workspace.getConfiguration('codeprep').get('outputFormat'), 'xml');
    });

    test('Output Format Configuration: json', async () => {
        const config = vscode.workspace.getConfiguration('codeprep');
        await config.update('outputFormat', 'json', vscode.ConfigurationTarget.Global);
        await sleep(1000);
        assert.strictEqual(vscode.workspace.getConfiguration('codeprep').get('outputFormat'), 'json');
    });

    test('TreeView should be registered', () => {
        // IDを指定してTreeViewを作成し、例外が出ないことを確認
        const treeView = vscode.window.createTreeView('codeprep.fileTree', {
            treeDataProvider: new FileTreeProvider(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath, new SelectionService(undefined as any))
        });
        assert.ok(treeView);
        treeView.dispose();
    });
});

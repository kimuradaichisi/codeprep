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

suite('Extension E2E Test Suite', function() {
    this.timeout(20000);

    test('Extension should be activated', () => {
        const extension = vscode.extensions.getExtension('codeprep.codeprep-vscode');
        assert.ok(extension);
    });

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    test('Full Flow: Select files and Generate content', async () => {
        // 初期化
        await vscode.commands.executeCommand('codeprep.clearAll');
        await sleep(500);

        // 1. 全選択を実行
        await vscode.commands.executeCommand('codeprep.selectAll');
        await sleep(1000); // ワークスペースの走査とUI更新を待つ
        
        // 2. 生成を実行（クリップボードにコピーされる）
        await vscode.commands.executeCommand('codeprep.generate');
        await sleep(500);
        
        // 3. クリップボードの内容を確認
        const clipboardText = await vscode.env.clipboard.readText();
        assert.ok(clipboardText.length > 0, 'Clipboard should not be empty');
        assert.ok(clipboardText.includes('## Directory Structure'), 'Should contain directory structure');
    });

    test('Configuration: Change format to JSON and verify output', async () => {
        const config = vscode.workspace.getConfiguration('codeprep');
        
        // JSON 形式に変更
        await config.update('outputFormat', 'json', vscode.ConfigurationTarget.Global);
        
        // 少し待機して設定を反映させる
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await vscode.commands.executeCommand('codeprep.selectAll');
        await vscode.commands.executeCommand('codeprep.generate');
        
        const clipboardText = await vscode.env.clipboard.readText();
        
        // JSON としてパースできるか確認
        try {
            const json = JSON.parse(clipboardText);
            assert.ok(json.repository, 'JSON should have repository property');
        } catch {
            assert.fail('Generated output is not valid JSON');
        }
        
        // 元に戻す
        await config.update('outputFormat', 'markdown', vscode.ConfigurationTarget.Global);
    });

    test('Command: Clear All should empty the selection', async () => {
        await vscode.commands.executeCommand('codeprep.selectAll');
        await vscode.commands.executeCommand('codeprep.clearAll');
        
        // 生成を試みる（選択が空なので何も起きない、またはメッセージが出る）
        // 以前のテキストをクリアしておく
        await vscode.env.clipboard.writeText('empty_test');
        
        await vscode.commands.executeCommand('codeprep.generate');
        
        const clipboardText = await vscode.env.clipboard.readText();
        assert.strictEqual(clipboardText, 'empty_test', 'Clipboard should not be updated when selection is empty');
    });
});

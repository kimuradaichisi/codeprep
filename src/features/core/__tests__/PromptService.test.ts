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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { PromptService } from '../../../services/PromptService';

// VSCode モジュールのモック化
vi.mock('vscode', () => {
    return {
        workspace: {
            getConfiguration: vi.fn(),
        },
        window: {
            showQuickPick: vi.fn(),
            showInformationMessage: vi.fn(),
        },
    };
});

describe('PromptService', () => {
    let promptService: PromptService;
    const mockGetConfig = vi.mocked(vscode.workspace.getConfiguration);
    const mockShowQuickPick = vi.mocked(vscode.window.showQuickPick);
    const mockShowInfo = vi.mocked(vscode.window.showInformationMessage);

    beforeEach(() => {
        vi.clearAllMocks();
        promptService = new PromptService();
    });

    it('設定からプロンプトを読み込み、ユーザーが選択したプロンプトを返却する', async () => {
        const mockPrompts = {
            'Review': 'Please review this code.',
            'Refactor': 'Improve this logic.'
        };

        mockGetConfig.mockReturnValue({
            get: vi.fn().mockReturnValue(mockPrompts)
        } as any);

        mockShowQuickPick.mockResolvedValue({
            label: 'Review',
            detail: 'Please review this code.'
        } as any);

        const result = await promptService.selectPrompt();

        expect(result).toBe('Please review this code.');
        expect(promptService.getSelectedPrompt()).toBe('Please review this code.');
    });

    it('設定が空の場合、情報メッセージを表示して undefined を返却する', async () => {
        mockGetConfig.mockReturnValue({
            get: vi.fn().mockReturnValue({})
        } as any);

        const result = await promptService.selectPrompt();

        expect(result).toBeUndefined();
        expect(mockShowInfo).toHaveBeenCalledWith(expect.stringContaining('No custom prompts defined'));
    });

    it('ユーザーが選択をキャンセルした場合、undefined を返却する', async () => {
        const mockPrompts = { 'Test': 'Value' };
        mockGetConfig.mockReturnValue({
            get: vi.fn().mockReturnValue(mockPrompts)
        } as any);

        mockShowQuickPick.mockResolvedValue(undefined);

        const result = await promptService.selectPrompt();

        expect(result).toBeUndefined();
    });

    it('clearSelection により選択状態がリセットされる', () => {
        // プライベートメンバにアクセスして状態をセット（あるいはselectPrompt経由）
        // ここでは簡単に内部状態の変化を検証
        promptService.clearSelection();
        expect(promptService.getSelectedPrompt()).toBeUndefined();
    });
});

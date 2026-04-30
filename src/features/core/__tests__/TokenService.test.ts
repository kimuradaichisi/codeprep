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
import { TokenService } from '../../../services/TokenService';

vi.mock('vscode', () => {
    const mockStatusBarItem = {
        command: '',
        text: '',
        tooltip: '',
        show: vi.fn(),
        hide: vi.fn(),
        dispose: vi.fn(),
    };
    return {
        window: {
            createStatusBarItem: vi.fn(() => mockStatusBarItem),
        },
        StatusBarAlignment: {
            Right: 2,
        },
        ThemeColor: vi.fn(),
        workspace: {
            getConfiguration: vi.fn(() => ({
                get: vi.fn((key, defaultValue) => defaultValue)
            }))
        }
    };
});

describe('TokenService', () => {
    let tokenService: TokenService;
    let mockStatusBarItem: any;

    beforeEach(() => {
        vi.clearAllMocks();
        tokenService = new TokenService();
        mockStatusBarItem = vi.mocked(vscode.window.createStatusBarItem).mock.results[0].value;
    });

    it('トークン数の計算と単位変換 (k表示) を検証する', () => {
        const files = [
            { path: 'a.ts', size: 2000 },
            { path: 'b.ts', size: 2000 },
        ];
        tokenService.updateStatistics(files);
        // 4000 chars / 4 = 1000 tokens = 1.0k
        expect(mockStatusBarItem.text).toContain('1.0k tokens');
    });

    it('ファイルが0件の場合はステータスバーを非表示にする', () => {
        tokenService.updateStatistics([]);
        expect(mockStatusBarItem.hide).toHaveBeenCalled();
    });

    it('トークン制限を超えた場合に背景色を変更する', () => {
        const files = [
            { path: 'large.ts', size: 400004 } // > 100000 tokens
        ];
        tokenService.updateStatistics(files);
        expect(mockStatusBarItem.backgroundColor).toBeDefined();
    });
});

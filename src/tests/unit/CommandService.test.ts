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
import { CommandService } from '../../services/CommandService';

vi.mock('vscode', () => {
    return {
        window: {
            withProgress: vi.fn((options, task) => task()),
            showInformationMessage: vi.fn(),
            showErrorMessage: vi.fn(),
            showTextDocument: vi.fn(),
            showWarningMessage: vi.fn()
        },
        ProgressLocation: {
            Notification: 15
        },
        env: {
            clipboard: {
                writeText: vi.fn()
            }
        },
        Uri: {
            file: vi.fn((p) => ({ fsPath: p })),
            parse: vi.fn((s) => ({ scheme: s.split(':')[0] }))
        },
        workspace: {
            getConfiguration: vi.fn(() => ({
                get: vi.fn((key, def) => def)
            })),
            fs: {
                readFile: vi.fn().mockResolvedValue(Buffer.from('test content')),
                writeFile: vi.fn().mockResolvedValue(undefined)
            }
        }
    };
});

describe('CommandService', () => {
    let commandService: CommandService;
    let mockPromptService: any;
    let mockNativeEngine: any;
    let mockTokenService: any;
    let mockPreviewProvider: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPromptService = {
            getSelectedPrompt: vi.fn().mockReturnValue('mock prompt')
        };
        mockNativeEngine = {
            generate: vi.fn().mockResolvedValue('mock output')
        };
        mockTokenService = {
            updateStatistics: vi.fn()
        };
        mockPreviewProvider = {
            update: vi.fn()
        };

        commandService = new CommandService(
            mockPromptService,
            mockNativeEngine,
            mockTokenService,
            mockPreviewProvider
        );
    });

    it('NativeEngineを実行し、クリップボードにコピーする', async () => {
        await commandService.execute('/root', ['src/test.ts']);
        
        expect(mockNativeEngine.generate).toHaveBeenCalled();
        expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith('mock output');
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(expect.stringContaining('Pack completed'));
    });

    it('実行中のエラーを適切にハンドルし、エラーメッセージを表示する', async () => {
        const errorMsg = 'Generation failed';
        mockNativeEngine.generate.mockRejectedValue(new Error(errorMsg));
        
        await commandService.execute('/root', ['src/test.ts']);
        
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(`CodePrep Error: ${errorMsg}`);
    });
});

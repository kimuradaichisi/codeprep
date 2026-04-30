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
import { CodePrepCLIEngine } from '../../../engines/CodePrepCLIEngine';
import { exec } from 'child_process';

// child_process のモック化
vi.mock('child_process', () => ({
    exec: vi.fn()
}));

// util.promisify をモックして、渡された関数がそのまま Promise を返すように振る舞わせる
vi.mock('util', () => ({
    promisify: (fn: any) => fn
}));

describe('CodePrepCLIEngine', () => {
    let engine: CodePrepCLIEngine;
    const mockExec = vi.mocked(exec);

    beforeEach(() => {
        vi.clearAllMocks();
        engine = new CodePrepCLIEngine();
    });

    it('npx codeprep コマンドが正常に実行される', async () => {
        const expectedOutput = 'CodePrep CLI executed successfully.';
        // execPromise (実体は mockExec) が Promise を返すように設定
        mockExec.mockResolvedValue({ stdout: expectedOutput, stderr: '' } as any);

        const result = await engine.generate([]);
        
        expect(result).toBe(expectedOutput);
        expect(mockExec).toHaveBeenCalledWith(
            expect.stringContaining('npx codeprep'),
            expect.any(Object)
        );
    });

    it('CLIの実行が失敗した場合にエラーを投げる', async () => {
        const errorMsg = 'Command not found';
        mockExec.mockRejectedValue(new Error(errorMsg));

        await expect(engine.generate([])).rejects.toThrow(`CLI Execution failed: ${errorMsg}`);
    });

    it('標準出力が空の場合のフォールバックメッセージを確認する', async () => {
        mockExec.mockResolvedValue({ stdout: '', stderr: '' } as any);

        const result = await engine.generate([]);
        expect(result).toBe('CodePrep CLI executed successfully.');
    });
});

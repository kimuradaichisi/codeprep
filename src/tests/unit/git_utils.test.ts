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
import { GitUtils } from '../../utils/git';
import * as child_process from 'child_process';
import * as vscode from 'vscode';

vi.mock('child_process', () => ({
    exec: vi.fn(),
}));

vi.mock('util', () => ({
    promisify: (fn: any) => (...args: any[]) => new Promise((resolve, reject) => {
        fn(...args, (err: any, stdout: any, stderr: any) => {
            if (err) reject(err);
            else resolve({ stdout, stderr });
        });
    })
}));

vi.mock('vscode', () => ({
    window: {
        showErrorMessage: vi.fn()
    }
}));

describe('GitUtils Coverage Enhancement', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return empty array when git output is empty', async () => {
        (child_process.exec as any).mockImplementation((cmd: string, opt: any, cb: (err: any, stdout: string, stderr: string) => void) => cb(null, '', ''));
        const result = await GitUtils.getModifiedFiles('/mock');
        expect(result).toEqual([]);
    });

    it('should handle git exec errors and show vscode error message', async () => {
        const errorMessage = 'Fatal: Not a git repository';
        (child_process.exec as any).mockImplementation((cmd: string, opt: any, cb: (err: any, stdout: string, stderr: string) => void) => {
            cb(new Error(errorMessage), '', '');
        });

        const result = await GitUtils.getModifiedFiles('/mock');
        expect(result).toEqual([]);
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
    });

    it('should handle quoted paths and spaces', async () => {
        const mockStdout = ' M "path with space.ts"\n?? untracked.txt';
        (child_process.exec as any).mockImplementation((cmd: string, opt: any, cb: (err: any, stdout: string, stderr: string) => void) => cb(null, mockStdout, ''));
        const result = await GitUtils.getModifiedFiles('/mock');
        expect(result).toContain('path with space.ts');
        expect(result).toContain('untracked.txt');
    });
});
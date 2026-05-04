import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitCliClient } from '../GitCliClient';
import * as child_process from 'child_process';

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
    workspace: {
        findFiles: vi.fn().mockResolvedValue([]),
        asRelativePath: vi.fn(uri => uri.fsPath)
    },
    Uri: {
        file: vi.fn(path => ({ fsPath: path }))
    }
}));

describe('GitCliClient', () => {
    let client: GitCliClient;

    beforeEach(() => {
        vi.clearAllMocks();
        client = new GitCliClient();
    });

    it('should return empty array when git output is empty', async () => {
        (child_process.exec as any).mockImplementation((cmd: string, opt: any, cb: (err: any, stdout: string, stderr: string) => void) => cb(null, '', ''));
        const result = await client.getModifiedFiles('/mock');
        expect(result.isSuccess).toBe(true);
        if (result.isSuccess) {
            expect(result.value).toEqual([]);
        }
    });

    it('should handle git exec errors and return Failure', async () => {
        const errorMessage = 'Fatal: Not a git repository';
        (child_process.exec as any).mockImplementation((cmd: string, opt: any, cb: (err: any, stdout: string, stderr: string) => void) => {
            cb(new Error(errorMessage), '', '');
        });

        const result = await client.getModifiedFiles('/mock');
        expect(result.isFailure).toBe(true);
        if (result.isFailure) {
            expect(result.error.message).toContain(errorMessage);
        }
    });

    it('should handle quoted paths and spaces', async () => {
        const mockStdout = ' M "path with space.ts"\n?? untracked.txt';
        (child_process.exec as any).mockImplementation((cmd: string, opt: any, cb: (err: any, stdout: string, stderr: string) => void) => cb(null, mockStdout, ''));
        const result = await client.getModifiedFiles('/mock');
        expect(result.isSuccess).toBe(true);
        if (result.isSuccess) {
            expect(result.value).toContain('path with space.ts');
            expect(result.value).toContain('untracked.txt');
        }
    });
});

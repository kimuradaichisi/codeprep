import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { VSCodeFileSystem } from '../VSCodeFileSystem';

vi.mock('vscode', () => ({
    workspace: {
        fs: {
            readFile: vi.fn(),
            readDirectory: vi.fn(),
            stat: vi.fn()
        }
    },
    Uri: { file: vi.fn(p => ({ fsPath: p })) },
    FileType: { File: 1, Directory: 2 }
}));

describe('VSCodeFileSystem', () => {
    let fs: VSCodeFileSystem;

    beforeEach(() => {
        vi.clearAllMocks();
        fs = new VSCodeFileSystem();
    });

    it('readFile: should return Success with content when successful', async () => {
        const content = new TextEncoder().encode('hello');
        (vscode.workspace.fs.readFile as any).mockResolvedValue(content);

        const result = await fs.readFile('/test.txt');
        
        expect(result.isSuccess).toBe(true);
        if (result.isSuccess) {
            expect(result.value).toBe('hello');
        }
    });

    it('readFile: should return Failure when vscode.fs throws', async () => {
        (vscode.workspace.fs.readFile as any).mockRejectedValue(new Error('Read error'));

        const result = await fs.readFile('/test.txt');
        
        expect(result.isFailure).toBe(true);
    });

    it('exists: should return true when stat succeeds', async () => {
        (vscode.workspace.fs.stat as any).mockResolvedValue({});
        const exists = await fs.exists('/path');
        expect(exists).toBe(true);
    });

    it('getFileSize: should return size from stat', async () => {
        (vscode.workspace.fs.stat as any).mockResolvedValue({ size: 1234 });
        const result = await fs.getFileSize('/file');
        expect(result.isSuccess).toBe(true);
        if (result.isSuccess) {
            expect(result.value).toBe(1234);
        }
    });
});


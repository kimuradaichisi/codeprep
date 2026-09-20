import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { VSCodeFileSystem } from '../VSCodeFileSystem';

vi.mock('vscode', () => ({
    workspace: {
        fs: {
            readFile: vi.fn(),
            readDirectory: vi.fn(),
            stat: vi.fn(),
            createDirectory: vi.fn(),
            writeFile: vi.fn()
        }
    },
    Uri: {
        file: vi.fn(p => ({ scheme: 'file', fsPath: p, path: p })),
        parse: vi.fn(str => ({ scheme: str.split(':')[0], path: str.replace(/^[^:]+:\/\/[^/]*/, '') })),
        joinPath: vi.fn((base, ...segments) => ({
            scheme: base.scheme,
            authority: base.authority,
            path: `${base.path}/${segments.join('/')}`.replace(/\/+/g, '/'),
            fsPath: `${base.fsPath || base.path}/${segments.join('/')}`.replace(/\/+/g, '/')
        }))
    },
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

    it('remote WSL: rootUriを持つ場合にリモートURIを保持してファイルを読み書きできること', async () => {
        const mockRootUri: any = {
            scheme: 'vscode-remote',
            authority: 'wsl+Ubuntu',
            path: '/home/user/project',
            fsPath: '\\home\\user\\project',
            with: vi.fn(change => ({ ...mockRootUri, ...change }))
        };
        const remoteFs = new VSCodeFileSystem(mockRootUri);

        // readDirectory
        (vscode.workspace.fs.readDirectory as any).mockResolvedValue([['src', 2]]);
        const dirResult = await remoteFs.readDirectory('/home/user/project');
        expect(dirResult.isSuccess).toBe(true);
        expect(vscode.workspace.fs.readDirectory).toHaveBeenCalledWith(
            expect.objectContaining({ scheme: 'vscode-remote' })
        );

        // readFile 相対パス
        const content = new TextEncoder().encode('package.json content');
        (vscode.workspace.fs.readFile as any).mockResolvedValue(content);
        const fileResult = await remoteFs.readFile('package.json');
        expect(fileResult.isSuccess).toBe(true);
        expect(vscode.workspace.fs.readFile).toHaveBeenCalledWith(
            expect.objectContaining({ scheme: 'vscode-remote', path: '/home/user/project/package.json' })
        );
    });
});



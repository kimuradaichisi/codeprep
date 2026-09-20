import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { VSCodeWorkspaceRepository } from '../VSCodeWorkspaceRepository';

vi.mock('vscode', () => ({
    workspace: {
        getConfiguration: vi.fn(),
        findFiles: vi.fn(),
        fs: { readFile: vi.fn() }
    },
    Uri: {
        file: (p: string) => ({ fsPath: p, scheme: 'file' }),
    },
    RelativePattern: class {
        constructor(public base: string, public pattern: string) { }
    }
}));

vi.mock('../../../../utils/path', () => ({
    getRelativePath: vi.fn((root, target) => target.replace(root + '/', '')),
    normalizePath: vi.fn((p: string) => p.replace(/\\/g, '/')),
}));

describe('VSCodeWorkspaceRepository (.gitignore integration)', () => {
    const mockRoot = '/mock/root';
    let repository: VSCodeWorkspaceRepository;

    beforeEach(() => {
        vi.clearAllMocks();
        repository = new VSCodeWorkspaceRepository(mockRoot);
        (vscode.workspace.getConfiguration as any).mockReturnValue({
            get: vi.fn((key: string, def: any) => def),
        });
    });

    it('reads .gitignore and includes its patterns in exclude passed to findFiles', async () => {
        const gitignore = '.vscode-test/\n# comment\nnode_modules/\n';
        (vscode.workspace.fs.readFile as any).mockResolvedValue(new TextEncoder().encode(gitignore));

        let capturedExclude: any = undefined;
        (vscode.workspace.findFiles as any).mockImplementation((pattern: any, exclude: any) => {
            capturedExclude = exclude;
            // return an empty list; we only assert the exclude argument
            return Promise.resolve([]);
        });

        await repository.getAllFiles();

        expect(capturedExclude).toBeDefined();
        expect(String(capturedExclude)).toContain('.vscode-test');
        expect(String(capturedExclude)).toContain('node_modules');
    });

    it('getFilesUnder passes exclude to findFiles as well', async () => {
        const gitignore = '.vscode-test/\n';
        (vscode.workspace.fs.readFile as any).mockResolvedValue(new TextEncoder().encode(gitignore));

        let capturedExclude: any = undefined;
        (vscode.workspace.findFiles as any).mockImplementation((pattern: any, exclude: any) => {
            capturedExclude = exclude;
            return Promise.resolve([]);
        });

        await repository.getFilesUnder('src');

        expect(capturedExclude).toBeDefined();
        expect(String(capturedExclude)).toContain('.vscode-test');
    });

    it('rootUri を渡した場合に RelativePattern に rootUri を指定しファイルを解決すること', async () => {
        const mockRemoteUri: any = {
            scheme: 'vscode-remote',
            authority: 'wsl+Ubuntu',
            path: '/home/user/project',
            fsPath: '\\home\\user\\project'
        };
        const repo = new VSCodeWorkspaceRepository('/home/user/project', mockRemoteUri);
        let capturedPattern: any = undefined;
        (vscode.workspace.findFiles as any).mockImplementation((pattern: any) => {
            capturedPattern = pattern;
            return Promise.resolve([
                { scheme: 'vscode-remote', path: '/home/user/project/src/index.ts', fsPath: '/home/user/project/src/index.ts' }
            ]);
        });

        const files = await repo.getAllFiles();
        expect(capturedPattern.base).toBe(mockRemoteUri);
        expect(files).toContain('src/index.ts');
    });
});


import * as vscode from 'vscode';
import * as nodePath from 'path';
import { IFileSystem } from '../domain/IFileSystem';
import { Result, ok, fail } from '../domain/Result';

export class VSCodeFileSystem implements IFileSystem {
    constructor(private readonly rootUri?: vscode.Uri) {}

    public async readFile(path: string): Promise<Result<string>> {
        try {
            const uri = this.resolveUri(path);
            const content = await vscode.workspace.fs.readFile(uri);
            return ok(Buffer.from(content).toString('utf8'));
        } catch (error) {
            return fail(error instanceof Error ? error : new Error(String(error)));
        }
    }

    public async getFileSize(path: string): Promise<Result<number>> {
        try {
            const uri = this.resolveUri(path);
            const stat = await vscode.workspace.fs.stat(uri);
            return ok(stat.size);
        } catch (error) {
            return fail(error instanceof Error ? error : new Error(String(error)));
        }
    }

    public async readDirectory(path: string): Promise<Result<[string, boolean][]>> {
        try {
            const uri = this.resolveUri(path);
            const entries = await vscode.workspace.fs.readDirectory(uri);
            const result: [string, boolean][] = entries.map(([name, type]) => [
                name,
                type === vscode.FileType.Directory
            ]);
            return ok(result);
        } catch (error) {
            return fail(error instanceof Error ? error : new Error(String(error)));
        }
    }

    public async exists(path: string): Promise<boolean> {
        try {
            const uri = this.resolveUri(path);
            await vscode.workspace.fs.stat(uri);
            return true;
        } catch {
            return false;
        }
    }

    public async writeFile(path: string, content: string): Promise<Result<void>> {
        try {
            const uri = this.resolveUri(path);
            const parent = this.resolveParentUri(uri, path);
            await vscode.workspace.fs.createDirectory(parent);
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
            return ok(undefined);
        } catch (error) {
            return fail(error instanceof Error ? error : new Error(String(error)));
        }
    }

    public resolveUri(targetPath: string): vscode.Uri {
        if (!targetPath) return this.rootUri ?? vscode.Uri.file('');
        if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(targetPath)) {
            return vscode.Uri.parse(targetPath);
        }
        if (this.rootUri) {
            return this.resolveWithRoot(targetPath);
        }
        return vscode.Uri.file(targetPath);
    }

    private resolveWithRoot(targetPath: string): vscode.Uri {
        const root = this.rootUri!;
        const normTarget = targetPath.replace(/\\/g, '/');
        const normFs = (root.fsPath || '').replace(/\\/g, '/');
        const normPath = (root.path || '').replace(/\\/g, '/');

        if (!normTarget.startsWith('/') && !/^[a-zA-Z]:\//.test(normTarget)) {
            return vscode.Uri.joinPath(root, normTarget);
        }
        const rel = this.stripRootPrefix(normTarget, normFs, normPath);
        if (rel !== undefined) {
            return rel ? vscode.Uri.joinPath(root, rel) : root;
        }
        if (root.scheme !== 'file') {
            return root.with({ path: normTarget.startsWith('/') ? normTarget : `/${normTarget}` });
        }
        return vscode.Uri.file(targetPath);
    }

    private stripRootPrefix(target: string, normFs: string, normPath: string): string | undefined {
        const lower = target.toLowerCase();
        if (normFs && lower.startsWith(normFs.toLowerCase())) {
            return target.slice(normFs.length).replace(/^\/+/, '');
        }
        if (normPath && lower.startsWith(normPath.toLowerCase())) {
            return target.slice(normPath.length).replace(/^\/+/, '');
        }
        return undefined;
    }

    private resolveParentUri(uri: vscode.Uri, rawPath: string): vscode.Uri {
        if (uri.scheme === 'file') {
            return vscode.Uri.file(nodePath.dirname(rawPath));
        }
        const parentPath = nodePath.posix.dirname(uri.path);
        return uri.with({ path: parentPath });
    }
}


import * as vscode from 'vscode';
import * as nodePath from 'path';
import { IFileSystem } from '../domain/IFileSystem';
import { Result, ok, fail } from '../domain/Result';

export class VSCodeFileSystem implements IFileSystem {
    public async readFile(path: string): Promise<Result<string>> {
        try {
            const uri = vscode.Uri.file(path);
            const content = await vscode.workspace.fs.readFile(uri);
            return ok(Buffer.from(content).toString('utf8'));
        } catch (error) {
            return fail(error instanceof Error ? error : new Error(String(error)));
        }
    }

    public async getFileSize(path: string): Promise<Result<number>> {
        try {
            const uri = vscode.Uri.file(path);
            const stat = await vscode.workspace.fs.stat(uri);
            return ok(stat.size);
        } catch (error) {
            return fail(error instanceof Error ? error : new Error(String(error)));
        }
    }

    public async readDirectory(path: string): Promise<Result<[string, boolean][]>> {
        try {
            const uri = vscode.Uri.file(path);
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
            const uri = vscode.Uri.file(path);
            await vscode.workspace.fs.stat(uri);
            return true;
        } catch {
            return false;
        }
    }

    public async writeFile(path: string, content: string): Promise<Result<void>> {
        try {
            const uri = vscode.Uri.file(path);
            const parent = vscode.Uri.file(nodePath.dirname(path));
            await vscode.workspace.fs.createDirectory(parent);
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
            return ok(undefined);
        } catch (error) {
            return fail(error instanceof Error ? error : new Error(String(error)));
        }
    }
}

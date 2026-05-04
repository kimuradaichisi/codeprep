import * as path from 'path';
import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { IGitClient } from '../domain/IGitClient';
import { Result, ok, fail } from '../../../shared/domain/Result';

const execAsync = promisify(exec);

export class GitCliClient implements IGitClient {
    private isExecuting = false;

    public async getModifiedFiles(root: string): Promise<Result<string[]>> {
        if (this.isExecuting) return ok([]);
        this.isExecuting = true;
        try {
            const cmd = 'git -c core.quotepath=false status --porcelain';
            const { stdout } = await execAsync(cmd, { cwd: root });
            const files = stdout.split('\n')
                .map(line => this.parseGitStatusLine(line))
                .filter(f => f.length > 0);
            return ok(files);
        } catch (error) {
            return fail(error instanceof Error ? error : new Error(String(error)));
        } finally {
            this.isExecuting = false;
        }
    }


    public async getDiff(root: string, excludePaths: string[] = []): Promise<Result<string>> {
        try {
            let cmd = 'git diff HEAD';
            if (excludePaths.length > 0) {
                const excludes = excludePaths.map(p => `":(exclude)${p}"`).join(' ');
                cmd += ` -- . ${excludes}`;
            }
            const { stdout } = await execAsync(cmd, { cwd: root });
            return ok(stdout);
        } catch (error) {
            return fail(error instanceof Error ? error : new Error(String(error)));
        }
    }

    public async findRelatedTests(root: string, files: string[]): Promise<Result<string[]>> {
        if (files.length === 0) return ok([]);
        try {
            const baseNames = files.map(f => path.basename(f, path.extname(f)).toLowerCase());
            const testUris = await vscode.workspace.findFiles('**/*.{spec,test,Test}.{ts,tsx,js,jsx}', '**/node_modules/**');
            const related = testUris
                .map(uri => vscode.workspace.asRelativePath(uri, false))
                .filter(rel => this.isRelatedTest(rel, baseNames));
            return ok(related);
        } catch (error) {
            return fail(error instanceof Error ? error : new Error(String(error)));
        }
    }

    private isRelatedTest(relPath: string, baseNames: string[]): boolean {
        const fileName = path.basename(relPath).toLowerCase();
        return baseNames.some(base => fileName.startsWith(base) || fileName.includes(`${base}_`));
    }


    private parseGitStatusLine(line: string): string {
        if (line.length < 4) return '';
        let filePath = line.substring(3).trim();
        if (filePath.startsWith('"') && filePath.endsWith('"')) {
            filePath = filePath.slice(1, -1);
        }
        return filePath.includes(' -> ') ? filePath.split(' -> ')[1] : filePath;
    }
}

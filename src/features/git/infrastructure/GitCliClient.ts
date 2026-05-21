import * as path from 'path';
import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { IGitClient } from '../domain/IGitClient';
import { Result, ok, fail } from '../../../shared/domain/Result';

const execAsync = promisify(exec);
type ExecAsync = (cmd: string, opts: { cwd: string }) => Promise<{ stdout: string }>;

// constructor追加
export class GitCliClient implements IGitClient {

    constructor(
        private execAsyncFn: ExecAsync = execAsync
    ) { }
    private isExecuting = false;

    public async getModifiedFiles(root: string): Promise<Result<string[]>> {
        if (this.isExecuting) return ok([]);
        this.isExecuting = true;
        try {
            const cmd = 'git -c core.quotepath=false status --porcelain';
            const { stdout } = await this.execAsyncFn(cmd, { cwd: root });
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
            const unstaged = await this.execDiff(root, excludePaths, false);
            const staged = await this.execDiff(root, excludePaths, true);

            const combined = [unstaged, staged]
                .filter(text => text.length > 0)
                .join('\n');

            return ok(combined);
        } catch (error) {
            return fail(error instanceof Error ? error : new Error(String(error)));
        }
    }

    private async execDiff(
        root: string,
        excludePaths: string[],
        staged: boolean
    ): Promise<string> {
        let cmd = staged ? 'git diff --cached' : 'git diff';

        if (excludePaths.length > 0) {
            const excludes = excludePaths
                .map(p => `":(exclude)${p}"`)
                .join(' ');
            cmd += ` -- . ${excludes}`;
        }

        try {
            console.debug(`[GitCliClient] execDiff: cmd=${cmd} cwd=${root} staged=${staged}`);
            const { stdout } = await this.execAsyncFn(cmd, { cwd: root });
            const snippet = stdout && stdout.length > 2000 ? stdout.substring(0, 2000) + '...[truncated]' : stdout;
            console.debug(`[GitCliClient] execDiff: stdout length=${stdout ? stdout.length : 0}\n${snippet}`);
            return stdout;
        } catch (err) {
            console.error('[GitCliClient] execDiff error:', err instanceof Error ? err.message : String(err));
            throw err;
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

    public async getRecentFiles(root: string, limit: number = 200): Promise<Result<string[]>> {
        try {
            // Get file names from recent commits
            const cmd = `git log --pretty=format: --name-only -n ${limit}`;
            const { stdout } = await this.execAsyncFn(cmd, { cwd: root });
            const lines = stdout.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            const counts: Record<string, number> = {};
            for (const l of lines) counts[l] = (counts[l] || 0) + 1;
            const files = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
            return ok(files);
        } catch (error) {
            return fail(error instanceof Error ? error : new Error(String(error)));
        }
    }
}

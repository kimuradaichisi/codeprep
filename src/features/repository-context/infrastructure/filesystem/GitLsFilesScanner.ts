import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import type { ListProjectFilesOptions } from './ProjectFileTree';
import { DEFAULT_EXCLUDED_DIR_NAMES } from '../../../../shared/filesystem/defaultExcludes';

export type GitProcessResult = Readonly<{ stdout: string; exitCode: number }>;

export type GitProcessRunner = Readonly<{
  run(command: string, args: readonly string[], cwd: string, signal?: AbortSignal): Promise<GitProcessResult>;
}>;

export const defaultGitRunner: GitProcessRunner = {
  run: (command, args, cwd, signal) => runGitProcess(command, args, cwd, signal),
};

const GIT_ARGS = ['-c', 'core.quotepath=false', '-c', 'safe.directory=*', 'ls-files', '-c', '-o', '--exclude-standard'];

export const tryListGitFiles = async (
  rootPath: string,
  options?: ListProjectFilesOptions,
  runner: GitProcessRunner = defaultGitRunner
): Promise<readonly string[] | undefined> => {
  if (options?.useGitignore === false || options?.signal?.aborted) return undefined;
  if (!await hasGitDir(rootPath)) return undefined;
  try {
    const result = await runner.run('git', GIT_ARGS, rootPath, options?.signal);
    if (result.exitCode !== 0 || options?.signal?.aborted) return undefined;
    return parseGitFiles(result.stdout, options);
  } catch {
    return undefined;
  }
};

async function hasGitDir(rootPath: string): Promise<boolean> {
  try {
    await access(join(rootPath, '.git'));
    return true;
  } catch {
    return false;
  }
}

function parseGitFiles(stdout: string, options?: ListProjectFilesOptions): readonly string[] {
  const lines = stdout.split(/\r?\n/);
  const files: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || isExcludedByDirName(trimmed)) continue;
    files.push(trimmed.replace(/\\/g, '/'));
  }
  options?.onProgress?.(files.length);
  return files.sort((a, b) => a.localeCompare(b));
}

function isExcludedByDirName(path: string): boolean {
  const segments = path.split(/[/\\]/);
  return segments.some((seg) => (DEFAULT_EXCLUDED_DIR_NAMES as readonly string[]).includes(seg));
}

function runGitProcess(
  command: string,
  args: readonly string[],
  cwd: string,
  signal?: AbortSignal
): Promise<GitProcessResult> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return resolve({ stdout: '', exitCode: 1 });
    const child = spawn(command, [...args], { cwd, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    const stdoutChunks: Buffer[] = [];
    child.stdout.on('data', (c: Buffer) => stdoutChunks.push(c));
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ stdout: Buffer.concat(stdoutChunks).toString('utf8'), exitCode: code ?? 1 });
    });
    signal?.addEventListener('abort', () => { child.kill(); resolve({ stdout: '', exitCode: 1 }); }, { once: true });
  });
}

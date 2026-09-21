// src/features/repository-context/infrastructure/filesystem/__tests__/GitLsFilesScanner.test.ts
import { describe, expect, it, vi } from 'vitest';
import { tryListGitFiles, type GitProcessRunner } from '../GitLsFilesScanner';

describe('GitLsFilesScanner', () => {
  it('useGitignore が false の場合は undefined を返すこと', async () => {
    const mockRunner: GitProcessRunner = { run: vi.fn() };
    const result = await tryListGitFiles(process.cwd(), { useGitignore: false }, mockRunner);
    expect(result).toBeUndefined();
    expect(mockRunner.run).not.toHaveBeenCalled();
  });

  it('.git ディレクトリが存在しない場合は undefined を返し runner を呼ばないこと', async () => {
    const mockRunner: GitProcessRunner = { run: vi.fn() };
    const result = await tryListGitFiles('/dummy/no-git-dir-here', {}, mockRunner);
    expect(result).toBeUndefined();
    expect(mockRunner.run).not.toHaveBeenCalled();
  });

  it('signal が既に aborted の場合は undefined を返すこと', async () => {
    const mockRunner: GitProcessRunner = { run: vi.fn() };
    const controller = new AbortController();
    controller.abort();
    const result = await tryListGitFiles(process.cwd(), { signal: controller.signal }, mockRunner);
    expect(result).toBeUndefined();
    expect(mockRunner.run).not.toHaveBeenCalled();
  });

  it('exitCode が非ゼロ（Git リポジトリではない等）の場合は undefined を返すこと', async () => {
    const mockRunner: GitProcessRunner = {
      run: vi.fn().mockResolvedValue({ stdout: '', exitCode: 128 }),
    };
    const result = await tryListGitFiles(process.cwd(), {}, mockRunner);
    expect(result).toBeUndefined();
    expect(mockRunner.run).toHaveBeenCalledTimes(1);
  });

  it('runner が例外をスローした場合に安全に undefined を返すこと', async () => {
    const mockRunner: GitProcessRunner = {
      run: vi.fn().mockRejectedValue(new Error('git command not found')),
    };
    const result = await tryListGitFiles(process.cwd(), {}, mockRunner);
    expect(result).toBeUndefined();
  });

  it('正常な出力をパースし、除外対象を除去してソートされた配列を返すこと', async () => {
    const stdout = [
      'src/b.ts',
      'src/a.ts',
      'node_modules/pkg/index.js',
      '.git/config',
      '',
      'docs/readme.md',
    ].join('\n');
    const mockRunner: GitProcessRunner = {
      run: vi.fn().mockResolvedValue({ stdout, exitCode: 0 }),
    };
    const onProgress = vi.fn();
    const result = await tryListGitFiles(process.cwd(), { onProgress }, mockRunner);

    expect(result).toEqual(['docs/readme.md', 'src/a.ts', 'src/b.ts']);
    expect(onProgress).toHaveBeenCalledWith(3);
  });
});

import { describe, expect, it, vi } from 'vitest';
import type { Project } from '../../desktop-core/domain/Project';
import { GitCoChangeClient, parseGitCoChangeOutput } from '../GitCoChangeClient';
import type { ProcessRunner } from '../RipgrepClient';

const project: Project = { id: 'p1', name: 'App', rootPath: 'C:\\repo' };

const runner = (run: ProcessRunner['run']): ProcessRunner => ({ run });

describe('parseGitCoChangeOutput', () => {
  it('counts valid co-changed project files and excludes the target', () => {
    const result = parseGitCoChangeOutput(
      '0123456\r\nsrc\\target.ts\r\ndocs\\auth.md\r\ndocs\\auth.md\r\n\r\n0123456789abcdef0123456789abcdef01234567\r\nsrc/target.ts\r\ndocs/auth.md\r\nREADME.md\r\n',
      'src/target.ts',
      'C:\\repo',
    );

    expect(result).toEqual([
      { relativePath: 'docs/auth.md', count: 2 },
      { relativePath: 'README.md', count: 1 },
    ]);
  });

  it('ignores malformed, outside-root, and invalid paths', () => {
    expect(parseGitCoChangeOutput(
      '0123456\nsrc/target.ts\n../secret.md\nC:/other/out.md\n\n',
      'src/target.ts',
      'C:\\repo',
    )).toEqual([]);
  });

  it('rejects Windows absolute paths when the project root is POSIX-shaped', () => {
    expect(parseGitCoChangeOutput(
      '0123456\nsrc/target.ts\nC:/other/out.md\n\n',
      'src/target.ts',
      '/repo',
    )).toEqual([]);
  });

  it('keeps only document files and ignores malformed commit blocks', () => {
    expect(parseGitCoChangeOutput(
      'not-a-commit\nsrc/target.ts\ndocs/auth.md\n\n' +
      '0123456789abcdef0123456789abcdef01234567\nsrc/target.ts\ndocs/auth.md\nsrc/config.ts\nREADME.md\n',
      'src/target.ts',
      'C:\\repo',
    )).toEqual([
      { relativePath: 'README.md', count: 1 },
      { relativePath: 'docs/auth.md', count: 1 },
    ]);
  });
});

describe('GitCoChangeClient', () => {
  it('uses argv, project cwd, and a bounded history', async () => {
    const run = vi.fn().mockResolvedValue({
      stdout: '0123456\nsrc/target.ts\ndocs/auth.md\n', stderr: '', exitCode: 0,
    });
    const result = await new GitCoChangeClient(runner(run), 7).recommend(project, 'src/target.ts');

    expect(run).toHaveBeenCalledWith(
      'git', ['log', '--name-only', '--format=%H', '--max-count', '7'], 'C:\\repo',
    );
    expect(result).toEqual([{
      projectId: 'p1', relativePath: 'docs/auth.md', reason: {
        source: 'gitCoChange', score: 1, detail: 'Changed in 1 shared commit(s)',
      },
    }]);
  });

  it('returns empty recommendations when git fails or history is empty', async () => {
    const run = vi.fn().mockRejectedValue(new Error('git unavailable'));
    const result = await new GitCoChangeClient(runner(run)).recommend(project, 'src/target.ts');
    expect(result).toEqual([]);
  });

  it('returns empty recommendations for an empty git history', async () => {
    const run = vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });
    const result = await new GitCoChangeClient(runner(run)).recommend(project, 'src/target.ts');
    expect(result).toEqual([]);
  });
});
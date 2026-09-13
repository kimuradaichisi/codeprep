import { describe, expect, it } from 'vitest';
import { GitCliRevisionAdapter, parseGitDiffNameStatus } from '../GitCliRevisionAdapter';
import type { ProcessRunner } from '../../search/RipgrepClient';

describe('parseGitDiffNameStatus', () => {
  it('correctly parses added, modified, deleted, and renamed files', () => {
    const rawOutput = [
      'A\tsrc/features/newFile.ts',
      'M\tsrc/features/existingFile.ts',
      'D\tsrc/oldFile.ts',
      'R100\tsrc/source.ts\tsrc/target.ts',
    ].join('\n');

    const result = parseGitDiffNameStatus(rawOutput, 'rev-a', 'rev-b');

    expect(result.fromRevision).toBe('rev-a');
    expect(result.toRevision).toBe('rev-b');
    expect(result.added).toEqual(['src/features/newFile.ts']);
    expect(result.modified).toEqual(['src/features/existingFile.ts']);
    expect(result.deleted).toEqual(['src/oldFile.ts']);
    expect(result.renamed).toEqual([{ oldPath: 'src/source.ts', newPath: 'src/target.ts' }]);
    expect(result.allChangedPaths).toContain('src/features/newFile.ts');
    expect(result.allChangedPaths).toContain('src/features/existingFile.ts');
    expect(result.allChangedPaths).toContain('src/oldFile.ts');
    expect(result.allChangedPaths).toContain('src/source.ts');
    expect(result.allChangedPaths).toContain('src/target.ts');
  });

  it('handles empty output cleanly', () => {
    const result = parseGitDiffNameStatus('', 'rev-a', 'rev-b');
    expect(result.added).toEqual([]);
    expect(result.modified).toEqual([]);
    expect(result.deleted).toEqual([]);
    expect(result.renamed).toEqual([]);
    expect(result.allChangedPaths).toEqual([]);
  });
});

describe('GitCliRevisionAdapter', () => {
  it('returns current revision and checks clean status via mock runner', async () => {
    const mockRunner: ProcessRunner = {
      run: async (_cmd, args) => {
        if (args.includes('rev-parse')) return { exitCode: 0, stdout: 'abc1234\n', stderr: '' };
        if (args.includes('--porcelain')) return { exitCode: 0, stdout: '', stderr: '' };
        return { exitCode: 0, stdout: 'M\tsrc/main.ts\n', stderr: '' };
      },
    };

    const adapter = new GitCliRevisionAdapter(mockRunner);
    const rev = await adapter.currentRevision('/workspace');
    const isClean = await adapter.isWorkingTreeClean('/workspace');
    const diff = await adapter.diff('/workspace', 'rev1', 'rev2');

    expect(rev).toBe('abc1234');
    expect(isClean).toBe(true);
    expect(diff.modified).toEqual(['src/main.ts']);
  });
});

import { describe, expect, it } from 'vitest';
import { GitMetadataClient, parseGitLog, parseGitStatus } from '../GitMetadataClient';
import type { ProcessRunner } from '../RipgrepClient';
import {
  gitEmptyOutput,
  gitFailureOutput,
  gitLogOutput,
  gitLogSingleOutput,
  gitStatusOutput,
  gitStatusSingleOutput,
} from './fixtures/processOutputs';

const project = { id: 'p1', name: 'App', rootPath: '/repo' };

const runner = (run: ProcessRunner['run']): ProcessRunner => ({ run });

const gitSuccessRunner = runner(async (_command, args) => {
  const stdout = args.includes('status') ? gitStatusSingleOutput : gitLogSingleOutput;
  return { stdout, stderr: '', exitCode: 0 };
});

describe('GitMetadataClient', () => {
  it('parses porcelain status paths', () => {
    expect(parseGitStatus(gitStatusOutput)).toEqual([
      'src/app.ts',
      'src/new.ts',
      'README.md',
    ]);
  });

  it('parses git log name-only output into unique recent paths', () => {
    expect(parseGitLog(gitLogOutput)).toEqual(['src/app.ts', 'README.md']);
  });

  it('returns metadata from status and recent git commands', async () => {
    const result = await new GitMetadataClient(gitSuccessRunner).getMetadata(project);

    expect(result.modifiedPaths).toEqual(['src/app.ts']);
    expect(result.recentPaths).toEqual(['README.md']);
  });

  it('bounds the recent git log scan with a named commit limit', async () => {
    const calls: string[][] = [];
    const client = new GitMetadataClient(runner(async (_command, args) => {
      calls.push([...args]);
      return { stdout: '', stderr: '', exitCode: 0 };
    }));

    await client.getMetadata(project);

    expect(calls.find(args => args.includes('log'))).toContain('--max-count=100');
  });

  it('maps git command failure to a gitFailure warning', async () => {
    const client = new GitMetadataClient(
      runner(async () => ({ stdout: '', stderr: gitEmptyOutput,
  gitFailureOutput, exitCode: 128 })),
    );

    const result = await client.getMetadata(project);

    expect(result.modifiedPaths).toEqual([]);
    expect(result.recentPaths).toEqual([]);
    expect(result.warning?.kind).toBe('gitFailure');
  });

  it('returns a gitFailure warning when status fails but log succeeds', async () => {
    const client = new GitMetadataClient(runner(async (_command, args) => ({
      stdout: args.includes('status') ? '' : gitLogSingleOutput,
      stderr: gitFailureOutput,
      exitCode: args.includes('status') ? 128 : 0,
    })));

    const result = await client.getMetadata(project);

    expect(result).toMatchObject({ modifiedPaths: [], recentPaths: [], warning: { kind: 'gitFailure' } });
  });

  it('returns a gitFailure warning when log fails but status succeeds', async () => {
    const client = new GitMetadataClient(runner(async (_command, args) => ({
      stdout: args.includes('log') ? '' : gitStatusSingleOutput,
      stderr: gitFailureOutput,
      exitCode: args.includes('log') ? 128 : 0,
    })));

    const result = await client.getMetadata(project);

    expect(result).toMatchObject({ modifiedPaths: [], recentPaths: [], warning: { kind: 'gitFailure' } });
  });
});


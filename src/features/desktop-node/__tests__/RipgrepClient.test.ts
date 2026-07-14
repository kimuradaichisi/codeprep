import { describe, expect, it } from 'vitest';
import { RipgrepClient } from '../RipgrepClient';
import type { ProcessRunner } from '../RipgrepClient';
import { parseRipgrepJson } from '../RipgrepJsonParser';
import {
  rgJsonWithDiagnosticLine,
  rgJsonWithDuplicateMatches,
} from './fixtures/processOutputs';

const project = { id: 'p1', name: 'App', rootPath: '/repo' };
const expectedMatches = [
  { relativePath: 'src/app.ts', excerpts: [] },
  { relativePath: 'README.md', excerpts: [] }
];

const runner = (run: ProcessRunner['run']): ProcessRunner => ({ run });

const clientWithCalls = (excludes: readonly string[] = []) => {
  const calls: string[][] = [];
  const run = async (command: string, args: readonly string[]) => {
    calls.push([command, ...args]);
    return { stdout: rgJsonWithDuplicateMatches, stderr: '', exitCode: 0 };
  };
  return { calls, client: new RipgrepClient(runner(run), excludes) };
};

const missingRgClient = () =>
  new RipgrepClient(runner(async () => {
    throw Object.assign(new Error('Ripgrep is not available.'), { code: 'ENOENT' });
  }));

describe('RipgrepClient', () => {
  it('collapses duplicate rg json matches to one relative path', () => {
    expect(parseRipgrepJson(rgJsonWithDuplicateMatches)).toEqual(expectedMatches);
  });

  it('ignores malformed diagnostic lines mixed with valid matches', () => {
    expect(parseRipgrepJson(rgJsonWithDiagnosticLine)).toEqual(expectedMatches);
  });

  it('passes hidden json glob arguments without shell interpolation', async () => {
    const { calls, client } = clientWithCalls(['**/node_modules/**']);

    await client.search(project, 'auth', 3);

    expect(calls[0]).toEqual(['rg', '--json', '--context', '3', '--hidden', '--glob', '!**/node_modules/**', '--', 'auth']);
  });

  it('passes context lines arguments correctly', async () => {
    const { calls, client } = clientWithCalls();

    await client.search(project, 'auth', 0);
    expect(calls[0]).toContain('0');

    await client.search(project, 'auth', 50);
    expect(calls[1]).toContain('50');
  });

  it('passes leading-dash queries after the option terminator', async () => {
    const { calls, client } = clientWithCalls();

    await client.search(project, '--fixed-strings', 3);

    expect(calls[0]?.slice(-2)).toEqual(['--', '--fixed-strings']);
  });

  it('passes project exclude patterns as glob arguments', async () => {
    const { calls, client } = clientWithCalls(['**/dist/**']);

    await client.search({ ...project, excludePatterns: ['**/.cache/**'] }, 'auth', 3);

    expect(calls[0]).toContain('!**/dist/**');
    expect(calls[0]).toContain('!**/.cache/**');
  });


  it('maps missing rg to a missingRg warning', async () => {
    const result = await missingRgClient().search(project, 'auth', 3);

    expect(result.matches).toEqual([]);
    expect(result.warning?.kind).toBe('missingRg');
  });

  it('maps non-ENOENT process failures to an rgFailure warning', async () => {
    const client = new RipgrepClient(runner(async () => {
      throw new Error('Access denied');
    }));

    const result = await client.search(project, 'auth', 3);

    expect(result.warning?.kind).toBe('rgFailure');
  });

  it('treats rg exit code 1 as no matches without a warning', async () => {
    const client = new RipgrepClient(runner(async () => ({ stdout: '', stderr: '', exitCode: 1 })));

    const result = await client.search(project, 'auth', 3);

    expect(result.matches).toEqual([]);
    expect(result.warning).toBeUndefined();
  });

  it('maps rg exit codes above 1 to an rgFailure warning', async () => {
    const client = new RipgrepClient(runner(async () => ({ stdout: '', stderr: '', exitCode: 2 })));

    const result = await client.search(project, 'auth', 3);

    expect(result.matches).toEqual([]);
    expect(result.warning?.kind).toBe('rgFailure');
  });
});


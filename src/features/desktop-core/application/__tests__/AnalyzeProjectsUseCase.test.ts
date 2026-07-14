import { describe, expect, it } from 'vitest';
import { AnalyzeProjectsUseCase } from '../AnalyzeProjectsUseCase';
import type { AnalysisWarning, AnalyzeProjectsPorts } from '../ports';

let receivedContextLines: number | undefined;

const basePorts: AnalyzeProjectsPorts = {
  projects: {
    getByIds: async () => [{ id: 'p1', name: 'App', rootPath: '/repo' }],
  },
  ripgrep: {
    search: async (_project, _query, contextLines) => {
      receivedContextLines = contextLines;
      return { matches: [{ relativePath: 'src/auth.ts', excerpts: [{ startLine: 8, endLine: 10, content: 'a\nb\nc\n' }] }] };
    },
  },
  gitMetadata: {
    getMetadata: async () => ({ modifiedPaths: ['README.md'], recentPaths: [] }),
  },
  fileContent: {
    canRead: async () => true,
    read: async () => undefined,
  },
};

const analyze = (ports: AnalyzeProjectsPorts = basePorts) => {
  receivedContextLines = undefined;
  return new AnalyzeProjectsUseCase(ports).analyze({ query: 'auth', projectIds: ['p1'], contextLines: 3 });
};

const withPorts = (
  overrides: Partial<AnalyzeProjectsPorts>,
): AnalyzeProjectsPorts => ({ ...basePorts, ...overrides });

const warning = (kind: AnalysisWarning['kind']): AnalysisWarning => ({
  kind,
  projectId: 'p1',
  message: `${kind} warning`,
});

describe('AnalyzeProjectsUseCase', () => {
  it('returns sorted candidates from rg and git signals', async () => {
    const result = await analyze();

    expect(result.candidates.map(file => file.relativePath)).toEqual([
      'src/auth.ts',
      'README.md',
    ]);
  });

  it('returns warnings for unreadable files', async () => {
    const result = await analyze(
      withPorts({ fileContent: { canRead: async (_, path) => path !== 'README.md', read: async () => undefined } }),
    );

    expect(result.candidates.map(file => file.relativePath)).toEqual(['src/auth.ts']);
    expect(result.warnings).toContainEqual({
      kind: 'unreadableFile',
      projectId: 'p1',
      relativePath: 'README.md',
      message: 'README.md cannot be read.',
    });
  });

  it('preserves missingRg warnings from ripgrep', async () => {
    const missingRg = warning('missingRg');
    const result = await analyze(
      withPorts({ ripgrep: { search: async (_p, _q, _c) => ({ matches: [], warning: missingRg }) } }),
    );

    expect(result.warnings).toContainEqual(missingRg);
  });

  it('preserves gitFailure warnings from git metadata', async () => {
    const gitFailure = warning('gitFailure');
    const result = await analyze(
      withPorts({
        gitMetadata: {
          getMetadata: async () => ({ modifiedPaths: [], recentPaths: [], warning: gitFailure }),
        },
      }),
    );

    expect(result.warnings).toContainEqual(gitFailure);
  });

  it('returns invalidRoot warnings for invalid project roots', async () => {
    const result = await analyze(
      withPorts({
        projects: { getByIds: async () => [{ id: 'p1', name: 'App', rootPath: ' ' }] },
      }),
    );

    expect(result.candidates).toEqual([]);
    expect(result.warnings).toContainEqual({
      kind: 'invalidRoot',
      projectId: 'p1',
      message: 'Project App has an invalid root.',
    });
  });

  it('merges duplicate signals and preserves combined reasons', async () => {
    const result = await analyze(
      withPorts({
        ripgrep: { search: async (_p, _q, _c) => ({ matches: [{ relativePath: 'src/auth.ts' }] }) },
        gitMetadata: {
          getMetadata: async () => ({ modifiedPaths: ['src/auth.ts'], recentPaths: [] }),
        },
      }),
    );

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].reasons).toEqual(['rgMatch', 'gitModified']);
  });

  it('adds recentCommit reasons from git recent paths', async () => {
    const result = await analyze(
      withPorts({
        ripgrep: { search: async (_p, _q, _c) => ({ matches: [] }) },
        gitMetadata: {
          getMetadata: async () => ({ modifiedPaths: [], recentPaths: ['src/recent.ts'] }),
        },
      }),
    );


    expect(result.candidates[0].relativePath).toBe('src/recent.ts');
    expect(result.candidates[0].reasons).toContain('recentCommit');
  });

  it('preserves ripgrep excerpts through project analysis', async () => {
    const result = await analyze();

    expect(result.candidates[0].excerpts).toEqual([
      { startLine: 8, endLine: 10, content: 'a\nb\nc\n' },
    ]);
    expect(receivedContextLines).toBe(3);
  });
});


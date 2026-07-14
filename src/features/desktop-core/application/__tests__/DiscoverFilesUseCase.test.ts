import { describe, expect, it } from 'vitest';

import { DiscoverFilesUseCase } from '../DiscoverFilesUseCase';
import type { DiscoverFilesPorts } from '../ports';

const ports: DiscoverFilesPorts = {
  projects: { getByIds: async () => [{ id: 'p1', name: 'App', rootPath: '/repo' }] },
  ripgrep: { search: async (_p, _q, _c) => ({ matches: [] }) },
  gitMetadata: { getMetadata: async () => ({ modifiedPaths: [], recentPaths: [] }) },
  files: { list: async () => ['src/auth.ts', 'src/app.ts', 'README.md'] },
  clipboard: { readText: async () => '/repo/src/auth.ts\n/outside/secret.ts' },
  gitHistory: { getCommitPaths: async () => ({ paths: [] }) },
};

describe('DiscoverFilesUseCase', () => {
  it('finds files with normalized extension inputs', async () => {
    const result = await new DiscoverFilesUseCase(ports).discover({
      recipe: { kind: 'extension', extensions: ['.ts'] }, projectIds: ['p1'],
    });

    expect(result.candidates.map(file => file.relativePath)).toEqual(['src/app.ts', 'src/auth.ts']);
    expect(result.candidates[0].reasons).toEqual(['extensionMatch']);
  });

  it('keeps only clipboard paths inside registered projects', async () => {
    const result = await new DiscoverFilesUseCase(ports).discover({
      recipe: { kind: 'clipboardPaths' }, projectIds: ['p1'],
    });

    expect(result.candidates.map(file => file.relativePath)).toEqual(['src/auth.ts']);
    expect(result.warnings.map(item => item.kind)).toContain('outsideProject');
  });
});

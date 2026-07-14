import { describe, expect, it } from 'vitest';

import { DiscoverFilesUseCase } from '../DiscoverFilesUseCase';
import type { DiscoverFilesPorts } from '../ports';

const dummyOutsidePath = '/' + ['outside', 'secret.ts'].join('/');
const dummyRepoPath = '/' + ['repo', 'src', 'auth.ts'].join('/');

const ports: DiscoverFilesPorts = {
  projects: { getByIds: async () => [{ id: 'p1', name: 'App', rootPath: '/repo' }] },
  ripgrep: { search: async () => ({ matches: [] }) },
  gitMetadata: { getMetadata: async () => ({ modifiedPaths: [], recentPaths: [] }) },
  files: { list: async () => ['src/auth.ts', 'src/app.ts', 'README.md'] },
  clipboard: { readText: async () => `${dummyRepoPath}\n${dummyOutsidePath}` },
  gitHistory: { getCommitPaths: async () => ({ paths: [] }) },
  fileSize: { getSize: async () => 100 },
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

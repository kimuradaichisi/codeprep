import { describe, expect, it } from 'vitest';
import { DirectoryProximityClient } from '../DirectoryProximityClient';
import type { Project } from '../../desktop-core/domain/Project';

const project: Project = { id: 'p1', name: 'App', rootPath: '/repo' };

const files = {
  list: async () => [
    { relativePath: 'docs/design.md', size: 10 },
    { relativePath: 'docs/auth.md', size: 20 },
    { relativePath: 'src/auth.ts', size: 30 },
  ],
};

describe('DirectoryProximityClient', () => {
  it('recommends other files in the selected file directory', async () => {
    const result = await new DirectoryProximityClient(files).recommend(project, 'docs/design.md');

    expect(result).toEqual([{
      projectId: 'p1', relativePath: 'docs/auth.md',
      reason: { source: 'directoryProximity', score: 0.5, detail: 'Same directory as docs/design.md' },
    }]);
  });

  it('returns no recommendations for a file without neighbors', async () => {
    const result = await new DirectoryProximityClient({
      list: async () => [{ relativePath: 'src/app.ts', size: 1 }],
    }).recommend(project, 'src/app.ts');

    expect(result).toEqual([]);
  });
});

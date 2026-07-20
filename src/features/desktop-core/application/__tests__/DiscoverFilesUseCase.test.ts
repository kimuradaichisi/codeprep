import { describe, expect, it } from 'vitest';

import { DiscoverFilesUseCase } from '../DiscoverFilesUseCase';
import type { DiscoverFilesPorts } from '../ports';
import { DependencyScanner } from '../../../engine/application/DependencyScanner';
import { createRecommendation, defaultRecommendationSettings } from '../../domain/Recommendation';

const dummyOutsidePath = '/' + ['outside', 'secret.ts'].join('/');
const dummyRepoPath = '/' + ['repo', 'src', 'auth.ts'].join('/');

const ports: DiscoverFilesPorts = {
  projects: { getByIds: async () => [{ id: 'p1', name: 'App', rootPath: '/repo' }] },
  ripgrep: { search: async () => ({ matches: [] }) },
  gitMetadata: { getMetadata: async () => ({ modifiedPaths: [], recentPaths: [] }) },
  files: { list: async () => [{ relativePath: 'src/auth.ts', size: 100 }, { relativePath: 'src/app.ts', size: 100 }, { relativePath: 'README.md', size: 100 }] },
  clipboard: { readText: async () => `${dummyRepoPath}\n${dummyOutsidePath}` },
  gitHistory: { getCommitPaths: async () => ({ paths: [] }) },
  fileSize: { getSize: async () => 100 },
  fileContent: { read: async () => '', canRead: async () => true },
  dependencyScanner: new DependencyScanner(),
  docGraph: { findRelated: async () => [] },
};

describe('DiscoverFilesUseCase', () => {
  it('finds files with normalized extension inputs', async () => {
    const result = await new DiscoverFilesUseCase(ports).discover({
      recipe: { kind: 'extension', extensions: ['.ts'] }, projectIds: ['p1'],
    });

    expect(result.candidates.map(file => file.relativePath)).toEqual(['src/app.ts', 'src/auth.ts']);
    expect(result.candidates[0].reasons).toEqual(['extensionMatch']);
  });

  it('adds enabled recommendations without selecting them', async () => {
    const recommendation = createRecommendation({
      projectId: 'p1', relativePath: 'README.md', source: 'markdownLink', score: 0.8, detail: 'linked',
    });
    if (!recommendation) throw new Error('Invalid test recommendation');
    const customPorts: DiscoverFilesPorts = {
      ...ports,
      recommendations: {
        markdownLink: { recommend: async () => [recommendation] },
        nameHeading: { recommend: async () => [] },
        gitCoChange: { recommend: async () => [] },
        directoryProximity: { recommend: async () => [] },
      },
    };
    const result = await new DiscoverFilesUseCase(customPorts).discover({
      recipe: { kind: 'extension', extensions: ['.ts'] }, projectIds: ['p1'],
      recommendationSettings: defaultRecommendationSettings(),
    });

    expect(result.candidates.map(file => file.relativePath)).toContain('README.md');
    expect(result.candidates.find(file => file.relativePath === 'README.md')?.excluded).toBe(false);
  });

  it('preserves base candidates when a recommendation source fails', async () => {
    const customPorts: DiscoverFilesPorts = {
      ...ports,
      recommendations: {
        markdownLink: { recommend: async () => { throw new Error('source failed'); } },
        nameHeading: { recommend: async () => [] },
        gitCoChange: { recommend: async () => [] },
        directoryProximity: { recommend: async () => [] },
      },
    };
    const result = await new DiscoverFilesUseCase(customPorts).discover({
      recipe: { kind: 'extension', extensions: ['.ts'] }, projectIds: ['p1'],
      recommendationSettings: defaultRecommendationSettings(),
    });

    expect(result.candidates.map(file => file.relativePath)).toEqual(['src/app.ts', 'src/auth.ts']);
    expect(result.warnings.map(warning => warning.kind)).toContain('recommendationFailure');
  });

  it('keeps only clipboard paths inside registered projects', async () => {
    const result = await new DiscoverFilesUseCase(ports).discover({
      recipe: { kind: 'clipboardPaths' }, projectIds: ['p1'],
    });

    expect(result.candidates.map(file => file.relativePath)).toEqual(['src/auth.ts']);
    expect(result.warnings.map(item => item.kind)).toContain('outsideProject');
  });

  it('resolves clipboard paths with suffixes and multi-segments', async () => {
    const customPorts = {
      ...ports,
      clipboard: { readText: async () => 'auth.ts\nsrc/app.ts\n"C:\\Project\\README.md:12"\nunknown.ts' }
    };
    const result = await new DiscoverFilesUseCase(customPorts).discover({
      recipe: { kind: 'clipboardPaths' }, projectIds: ['p1'],
    });

    expect(result.candidates.map(file => file.relativePath)).toEqual(['src/auth.ts', 'src/app.ts', 'README.md']);
    expect(result.warnings[0].message).toContain('Unresolved: unknown.ts');
  });

  it('finds related documents using DocGraph', async () => {
    const customPorts: DiscoverFilesPorts = {
      ...ports,
      docGraph: {
        findRelated: async (project, relativePath) => {
          if (relativePath === 'README.md') {
            return [{ path: 'src/app.ts', reason: 'docgraph', confidence: 0.85 }];
          }
          return [];
        }
      }
    };
    const result = await new DiscoverFilesUseCase(customPorts).discover({
      recipe: { kind: 'docGraph', path: 'README.md' }, projectIds: ['p1']
    });

    expect(result.candidates.map(file => file.relativePath)).toEqual(['src/app.ts']);
    expect(result.candidates[0].reasons).toEqual(['docgraph']);
    expect(result.candidates[0].score).toEqual(0.85);
  });
});

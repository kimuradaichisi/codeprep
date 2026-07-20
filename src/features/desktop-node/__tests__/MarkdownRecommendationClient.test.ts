import { describe, expect, it, vi } from 'vitest';
import type { FileContentPort, ProjectFilePort } from '../../desktop-core/application/ports';
import type { Project } from '../../desktop-core/domain/Project';
import { MarkdownRecommendationClient, extractMarkdownRecommendations } from '../MarkdownRecommendationClient';

const project: Project = { id: 'p1', name: 'App', rootPath: '/repo' };

describe('extractMarkdownRecommendations', () => {
  it('returns existing project-local relative links with deterministic details', () => {
    const result = extractMarkdownRecommendations(
      'See [auth](../docs\\auth.md) and [external](https://example.com).',
      'guides/design.md',
      ['docs/auth.md', 'guides/design.md'],
    );

    expect(result).toEqual([{
      relativePath: 'docs/auth.md',
      score: 0.8,
      detail: 'Markdown link from guides/design.md',
    }]);
  });

  it('excludes anchors, absolute URLs, root escapes, and missing paths', () => {
    const result = extractMarkdownRecommendations(
      '[anchor](#section) [url](mailto:a@b.test) [root](/secret.md) [escape](../../secret.md) [missing](missing.md)',
      'docs/design.md',
      ['docs/design.md'],
    );

    expect(result).toEqual([]);
  });

  it('does not recommend Markdown or Wiki links that point to the source', () => {
    const result = extractMarkdownRecommendations(
      '[self](design.md) [[design.md]] [[design]]',
      'docs\\design.md',
      ['docs\\design.md'],
    );

    expect(result).toEqual([]);
  });

  it('resolves extensionless Wiki links against Markdown candidates', () => {
    const result = extractMarkdownRecommendations(
      'See [[auth]] and [[nested\\profile]].',
      'docs\\design.md',
      ['docs\\design.md', 'docs\\auth.md', 'docs\\nested\\profile.markdown'],
    );

    expect(result.map(item => item.relativePath)).toEqual([
      'docs/auth.md',
      'docs/nested/profile.markdown',
    ]);
  });

  it('recommends Markdown files whose headings match normalized source filename tokens', () => {
    const result = extractMarkdownRecommendations(
      '# API Design\nSee [auth](auth.md)',
      'docs/API-Design.md',
      ['docs/API-Design.md', 'docs/auth.md', 'docs/api_reference.md'],
      new Map([
        ['docs/auth.md', '# Authentication API'],
        ['docs/api_reference.md', '# API Design Reference'],
      ]),
    );

    expect(result).toEqual([
      {
        relativePath: 'docs/auth.md',
        score: 0.8,
        detail: 'Markdown link from docs/API-Design.md',
      },
      {
        relativePath: 'docs/api_reference.md',
        score: 0.6,
        detail: 'Filename or heading match from docs/API-Design.md',
      },
    ]);
  });
});

describe('MarkdownRecommendationClient', () => {
  it('returns readable linked files with the project id and normalized key', async () => {
    const files: ProjectFilePort = { list: vi.fn().mockResolvedValue([
      { relativePath: 'docs/auth.md', size: 10 },
      { relativePath: 'docs/design.md', size: 10 },
    ]) };
    const fileContent: FileContentPort = {
      read: vi.fn().mockResolvedValue('[auth](auth.md)'),
      canRead: vi.fn().mockResolvedValue(true),
    };

    const result = await new MarkdownRecommendationClient(fileContent, files).recommend(project, 'docs\\design.md');

    expect(result).toEqual([{
      projectId: 'p1', relativePath: 'docs/auth.md', reason: {
        source: 'markdownLink', score: 0.8, detail: 'Markdown link from docs/design.md',
      },
    }]);
  });

  it('ignores unreadable linked files and returns project keyed records', async () => {
    const files: ProjectFilePort = { list: vi.fn().mockResolvedValue([
      { relativePath: 'docs/auth.md', size: 10 },
      { relativePath: 'docs/design.md', size: 10 },
    ]) };
    const fileContent: FileContentPort = {
      read: vi.fn().mockResolvedValue('[auth](auth.md)'),
      canRead: vi.fn().mockResolvedValue(false),
    };

    const result = await new MarkdownRecommendationClient(fileContent, files).recommend(project, 'docs/design.md');

    expect(result).toEqual([]);
  });

  it('returns nameHeading recommendations without duplicating linked paths', async () => {
    const files: ProjectFilePort = { list: vi.fn().mockResolvedValue([
      { relativePath: 'docs/API-Design.md', size: 10 },
      { relativePath: 'docs/auth.md', size: 10 },
      { relativePath: 'docs/api_reference.md', size: 10 },
    ]) };
    const fileContent: FileContentPort = {
      read: vi.fn().mockImplementation(async (_project: Project, path: string) => ({
        'docs/API-Design.md': '[auth](auth.md)',
        'docs/auth.md': '# Authentication API',
        'docs/api_reference.md': '# API Design Reference',
      }[path])),
      canRead: vi.fn().mockResolvedValue(true),
    };

    const result = await new MarkdownRecommendationClient(fileContent, files)
      .recommend(project, 'docs/API-Design.md');

    expect(result.map(item => item.reason.source)).toEqual(['markdownLink', 'nameHeading']);
    expect(result.map(item => item.relativePath)).toEqual(['docs/auth.md', 'docs/api_reference.md']);
  });

  it('does not recommend documents matched only by general words', async () => {
    const files: ProjectFilePort = { list: vi.fn().mockResolvedValue([
      { relativePath: 'docs/api.md', size: 10 },
      { relativePath: 'docs/design.md', size: 10 },
      { relativePath: 'docs/test.md', size: 10 },
    ]) };
    const fileContent: FileContentPort = {
      read: vi.fn().mockImplementation(async (_project: Project, path: string) => ({
        'docs/api.md': '# Design',
        'docs/design.md': '# Test',
        'docs/test.md': '# API',
      }[path])),
      canRead: vi.fn().mockResolvedValue(true),
    };

    const result = await new MarkdownRecommendationClient(fileContent, files)
      .recommend(project, 'docs/api.md');

    expect(result).toEqual([]);
  });
});
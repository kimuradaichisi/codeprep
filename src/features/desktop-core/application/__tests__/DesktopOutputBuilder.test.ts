import { describe, expect, it } from 'vitest';
import { DesktopOutputBuilder } from '../DesktopOutputBuilder';
import { createCandidateFile } from '../../domain/CandidateFile';
import type { FileContentPort } from '../ports';

const project = { id: 'p1', name: 'App', rootPath: '/repo' };
const projects = [project];

const mockFileContent = (content: string): FileContentPort => ({
  canRead: async () => true,
  read: async () => content,
});

describe('DesktopOutputBuilder', () => {
  it('maps excerpts to snippets format and issues warnings for missing excerpts', async () => {
    const builder = new DesktopOutputBuilder(mockFileContent('physical content'));
    const candidates = [
      createCandidateFile('p1', 'src/app.ts', ['rgMatch'], [
        { startLine: 10, endLine: 12, content: 'a\nb\nc\n' }
      ]),
      createCandidateFile('p1', 'README.md', ['rgMatch'], [])
    ];

    const result = await builder.build(candidates, projects, 500, 'matchedSnippets');

    expect(result.files).toEqual([
      { relativePath: 'src/app.ts:10-12', content: 'a\nb\nc\n' }
    ]);
    expect(result.warnings).toEqual([
      {
        kind: 'missingExcerpt',
        projectId: 'p1',
        relativePath: 'README.md',
        message: 'No excerpts available for README.md.',
      }
    ]);
  });

  it('preserves existing full mode behavior', async () => {
    const builder = new DesktopOutputBuilder(mockFileContent('full content'));
    const candidates = [createCandidateFile('p1', 'src/app.ts', ['rgMatch'])];

    const result = await builder.build(candidates, projects, 500, 'full');

    expect(result.files).toEqual([
      { relativePath: 'src/app.ts', content: 'full content' }
    ]);
    expect(result.warnings).toEqual([]);
  });
});

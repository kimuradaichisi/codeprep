import { describe, expect, it } from 'vitest';
import { DesktopOutputBuilder } from '../DesktopOutputBuilder';
import { createCandidateFile } from '../../domain/CandidateFile';
import type { FileContentPort } from '../ports';
import { SkeletonService } from '../../../engine/domain/SkeletonService';
import { DependencyScanner } from '../../../engine/application/DependencyScanner';

const project = { id: 'p1', name: 'App', rootPath: '/repo' };
const projects = [project];

const mockFileContent = (content: string): FileContentPort => ({
  canRead: async () => true,
  read: async () => content,
});

describe('DesktopOutputBuilder', () => {
  it('maps excerpts to snippets format and issues warnings for missing excerpts', async () => {
    const builder = new DesktopOutputBuilder(mockFileContent('physical content'), new SkeletonService(), new DependencyScanner());
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
    const builder = new DesktopOutputBuilder(mockFileContent('full content'), new SkeletonService(), new DependencyScanner());
    const candidates = [createCandidateFile('p1', 'src/app.ts', ['rgMatch'])];

    const result = await builder.build(candidates, projects, 500, 'full');

    expect(result.files).toEqual([
      { relativePath: 'src/app.ts', content: 'full content' }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('includes resolved dependencies as skeletons when includeDependencies is true', async () => {
    const filesMap: Record<string, string> = {
      'src/app.ts': "import { helper } from './helper';\nclass App {}",
      'src/helper.ts': "export function helper() {\n  console.log(1);\n}"
    };
    const fileContentMock: FileContentPort = {
      canRead: async () => true,
      read: async (p, rel) => filesMap[rel]
    };
    const builder = new DesktopOutputBuilder(fileContentMock, new SkeletonService(), new DependencyScanner());
    const candidates = [createCandidateFile('p1', 'src/app.ts', ['rgMatch'])];

    const result = await builder.build(candidates, projects, 500, 'full', true);

    expect(result.files).toEqual([
      { relativePath: 'src/app.ts', content: "import { helper } from './helper';\nclass App {}" },
      { relativePath: 'src/helper.ts', content: "export function helper() {\n  // ... implementation omitted\n}" }
    ]);
  });
});

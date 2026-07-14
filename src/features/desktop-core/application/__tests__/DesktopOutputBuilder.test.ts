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

  it('automatically degrades low priority files to skeleton to fit token budget', async () => {
    const filesMap: Record<string, string> = {
      'src/pinned.ts': "export class Pinned {\n  // important logic here\n}",
      'src/match.ts': "export function match() {\n  console.log(1);\n  console.log(2);\n  console.log(3);\n  console.log(4);\n  console.log(5);\n}"
    };
    const fileContentMock: FileContentPort = {
      canRead: async () => true,
      read: async (p, rel) => filesMap[rel]
    };
    const builder = new DesktopOutputBuilder(fileContentMock, new SkeletonService(), new DependencyScanner());
    const candidates = [
      createCandidateFile('p1', 'src/pinned.ts', ['manualPin']),
      createCandidateFile('p1', 'src/match.ts', ['extensionMatch'])
    ];

    const result = await builder.build(candidates, projects, 500, 'full', false, 30, true);

    expect(result.files).toEqual([
      { relativePath: 'src/pinned.ts', content: "export class Pinned {\n  // important logic here\n}" },
      { relativePath: 'src/match.ts', content: "export function match() {\n  // ... implementation omitted\n}" }
    ]);
  });

  it('excludes candidates entirely when they exceed the budget even after skeletonization when autoOptimize is true', async () => {
    const filesMap: Record<string, string> = {
      'src/pinned.ts': "export class Pinned {\n  // important logic here\n}",
      'src/match.ts': "export function match() {\n  console.log(1);\n  console.log(2);\n  console.log(3);\n  console.log(4);\n  console.log(5);\n}"
    };
    const fileContentMock: FileContentPort = {
      canRead: async () => true,
      read: async (p, rel) => filesMap[rel]
    };
    const builder = new DesktopOutputBuilder(fileContentMock, new SkeletonService(), new DependencyScanner());
    const candidates = [
      createCandidateFile('p1', 'src/pinned.ts', ['manualPin']),
      createCandidateFile('p1', 'src/match.ts', ['extensionMatch'])
    ];

    const result = await builder.build(candidates, projects, 500, 'full', false, 20, true);

    expect(result.files).toEqual([
      { relativePath: 'src/pinned.ts', content: "export class Pinned {\n  // important logic here\n}" }
    ]);
    expect(result.warnings).toEqual([
      {
        kind: 'oversizedFile',
        projectId: 'p1',
        relativePath: 'src/match.ts',
        message: 'File src/match.ts was excluded to fit the token budget.'
      }
    ]);
  });

  it('does not degrade or exclude candidates when autoOptimize is false', async () => {
    const filesMap: Record<string, string> = {
      'src/pinned.ts': "export class Pinned {\n  // important logic here\n}",
      'src/match.ts': "export function match() {\n  // ... implementation\n}"
    };
    const fileContentMock: FileContentPort = {
      canRead: async () => true,
      read: async (p, rel) => filesMap[rel]
    };
    const builder = new DesktopOutputBuilder(fileContentMock, new SkeletonService(), new DependencyScanner());
    const candidates = [
      createCandidateFile('p1', 'src/pinned.ts', ['manualPin']),
      createCandidateFile('p1', 'src/match.ts', ['extensionMatch'])
    ];

    const result = await builder.build(candidates, projects, 500, 'full', false, 20, false);

    // 縮退されないため、元のコンテンツのままパッキングされる
    expect(result.files).toEqual([
      { relativePath: 'src/pinned.ts', content: "export class Pinned {\n  // important logic here\n}" },
      { relativePath: 'src/match.ts', content: "export function match() {\n  // ... implementation\n}" }
    ]);
    expect(result.warnings).toEqual([]);
  });
});

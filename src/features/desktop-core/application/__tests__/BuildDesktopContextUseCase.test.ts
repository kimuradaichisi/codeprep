import { describe, expect, it } from 'vitest';
import { BuildDesktopContextUseCase } from '../BuildDesktopContextUseCase';
import type { BuildDesktopContextPorts, ContextFormatterPort } from '../ports';

const project = { id: 'project-1', name: 'Demo', rootPath: '/demo' };
const candidate = { projectId: project.id, relativePath: 'src/app.ts', reasons: ['rgMatch'] as const, excluded: false };

describe('BuildDesktopContextUseCase', () => {
  it.each(['markdown', 'xml', 'json'] as const)('formats selected content as %s', async format => {
    const result = await createUseCase('const value = 1;').build({ candidates: [candidate], format, maxFileSizeKB: 1 });

    expect(result.preview).toBe(`${format}:src/app.ts:const value = 1;`);
    expect(result.warnings).toEqual([]);
  });

  it('returns a warning when a selected file cannot be read', async () => {
    const result = await createUseCase(undefined).build({ candidates: [candidate], format: 'markdown', maxFileSizeKB: 1 });

    expect(result.preview).toBe('markdown:');
    expect(result.warnings[0]).toMatchObject({ kind: 'unreadableFile', relativePath: 'src/app.ts' });
  });

  it('omits oversized content before it reaches the formatter', async () => {
    const result = await createUseCase('a'.repeat(1025)).build({ candidates: [candidate], format: 'markdown', maxFileSizeKB: 1 });

    expect(result.preview).toBe('markdown:');
    expect(result.warnings[0]).toMatchObject({ kind: 'oversizedFile', relativePath: 'src/app.ts' });
  });

  it('supports matchedSnippets mode utilizing excerpts without file reads', async () => {
    const candidateWithExcerpts = {
      projectId: project.id,
      relativePath: 'src/app.ts',
      reasons: ['rgMatch'] as const,
      excluded: false,
      excerpts: [{ startLine: 1, endLine: 2, content: 'excerpt line\n' }]
    };
    const result = await createUseCase(undefined).build({
      candidates: [candidateWithExcerpts],
      format: 'markdown',
      maxFileSizeKB: 1,
      packMode: 'matchedSnippets'
    });

    expect(result.preview).toBe('markdown:src/app.ts:1-2:excerpt line\n');
    expect(result.warnings).toEqual([]);
  });
});


const createUseCase = (content: string | undefined): BuildDesktopContextUseCase =>
  new BuildDesktopContextUseCase(createPorts(content));

const createPorts = (content: string | undefined): BuildDesktopContextPorts => ({
  projects: { getByIds: async () => [project] },
  fileContent: { canRead: async () => content !== undefined, read: async () => content },
  formatter: formatter(),
});

const formatter = (): ContextFormatterPort => ({
  format: ({ format, files }) => `${format}:${files.map(file => `${file.relativePath}:${file.content}`).join(',')}`,
});

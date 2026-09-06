// src/features/repository-context/application/__tests__/ClipboardPathResolver.test.ts
import { describe, expect, it } from 'vitest';
import { ClipboardPathResolver, extractCandidatePaths } from '../ClipboardPathResolver';
import type { Project } from '../../domain/Project';

describe('ClipboardPathResolver', () => {
  const project: Project = { id: 'p1', name: 'App', rootPath: '/repo' };
  const mockFiles = [
    { relativePath: 'src/components/Button.tsx', size: 120 },
    { relativePath: 'src/components/Modal.tsx', size: 240 },
    { relativePath: 'src/utils/math.ts', size: 50 },
    { relativePath: 'README.md', size: 80 },
  ];

  it('extracts directory paths and file paths from multiline text', () => {
    const text = 'src/components\nREADME.md\n- "src/utils/math.ts:15"\nunknown/dir';
    const paths = extractCandidatePaths(text);
    expect(paths).toContain('src/components');
    expect(paths).toContain('README.md');
    expect(paths).toContain('src/utils/math.ts');
  });

  it('resolves all files under a matched directory path', async () => {
    const resolver = new ClipboardPathResolver({
      clipboard: { readText: async () => 'src/components' },
      files: { list: async () => mockFiles },
    });

    const result = await resolver.resolve([project]);
    expect(result.candidates.map(c => c.relativePath)).toEqual([
      'src/components/Button.tsx',
      'src/components/Modal.tsx',
    ]);
    expect(result.candidates.every(c => c.reasons.includes('clipboardPath'))).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('resolves both single file and directory paths in clipboard', async () => {
    const resolver = new ClipboardPathResolver({
      clipboard: { readText: async () => 'src/components\nREADME.md' },
      files: { list: async () => mockFiles },
    });

    const result = await resolver.resolve([project]);
    expect(result.candidates.map(c => c.relativePath)).toEqual([
      'src/components/Button.tsx',
      'src/components/Modal.tsx',
      'README.md',
    ]);
  });

  it('records outsideProject warning for unresolved paths', async () => {
    const resolver = new ClipboardPathResolver({
      clipboard: { readText: async () => 'nonexistent/folder\nREADME.md' },
      files: { list: async () => mockFiles },
    });

    const result = await resolver.resolve([project]);
    expect(result.candidates.map(c => c.relativePath)).toEqual(['README.md']);
    expect(result.warnings[0].kind).toBe('outsideProject');
    expect(result.warnings[0].message).toContain('nonexistent/folder');
  });
});

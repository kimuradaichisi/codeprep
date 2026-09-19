// src/features/repository-context/infrastructure/workingset/__tests__/DefaultSourceExtractor.test.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect } from 'vitest';
import { DefaultSourceExtractor } from '../DefaultSourceExtractor';
import type { Project } from '../../../domain/Project';
import type { FileContentPort } from '../../../application/ports';

describe('DefaultSourceExtractor', () => {
  const project: Project = { id: 'test-p', name: 'Test', rootPath: '/ws', excludePatterns: [] };
  const mockFileContent: FileContentPort = {
    canRead: async () => true,
    read: async (_, path) => {
      if (path === 'src/found.ts') return 'line1\nline2\nline3\nline4\nline5';
      return undefined;
    },
  };

  const extractor = new DefaultSourceExtractor(mockFileContent);

  it('returns metadata only without reading when granularity is METADATA_ONLY', async () => {
    const res = await extractor.extract(project, 'src/found.ts', 'METADATA_ONLY');
    expect(res.finalGranularity).toBe('METADATA_ONLY');
    expect(res.content).toBeUndefined();
  });

  it('falls back to METADATA_ONLY if file cannot be read', async () => {
    const res = await extractor.extract(project, 'src/missing.ts', 'FULL_FILE');
    expect(res.finalGranularity).toBe('METADATA_ONLY');
    expect(res.content).toBeUndefined();
  });

  it('extracts FULL_FILE content correctly', async () => {
    const res = await extractor.extract(project, 'src/found.ts', 'FULL_FILE');
    expect(res.finalGranularity).toBe('FULL_FILE');
    expect(res.content).toBe('line1\nline2\nline3\nline4\nline5');
    expect(res.estimatedTokens).toBeGreaterThan(0);
  });

  it('extracts SYMBOL_RANGE chunks correctly and falls back to FULL_FILE when ranges empty', async () => {
    const rangeRes = await extractor.extract(project, 'src/found.ts', 'SYMBOL_RANGE', [
      { startLine: 2, endLine: 4 },
    ]);
    expect(rangeRes.finalGranularity).toBe('SYMBOL_RANGE');
    expect(rangeRes.content).toBe('line2\nline3\nline4');

    const emptyRangeRes = await extractor.extract(project, 'src/found.ts', 'SYMBOL_RANGE', []);
    expect(emptyRangeRes.finalGranularity).toBe('FULL_FILE');
    expect(emptyRangeRes.content).toBe('line1\nline2\nline3\nline4\nline5');
  });
});

import { describe, expect, it } from 'vitest';
import {
  CURRENT_KNOWLEDGE_SCHEMA_VERSION,
  sortKnowledgeEntries,
  type StructuredKnowledgeEntry,
} from '../StructuredKnowledgeIndex';
import { calculateKnowledgeMetrics } from '../StructuredKnowledgeMetrics';

describe('StructuredKnowledgeIndex Domain', () => {
  it('schema version is 1', () => {
    expect(CURRENT_KNOWLEDGE_SCHEMA_VERSION).toBe(1);
  });

  it('calculates metrics correctly', () => {
    const entries: StructuredKnowledgeEntry[] = [
      {
        entryId: 'p:a.md#sec:1:root:1',
        projectId: 'p',
        relativePath: 'a.md',
        kind: 'markdown-section',
        headingLevel: 1,
        headingText: 'A',
        headingPath: ['A'],
        startLine: 1,
        endLine: 5,
        content: '# A',
      },
      {
        entryId: 'p:b.ts#sym:function:fn:1',
        projectId: 'p',
        relativePath: 'b.ts',
        kind: 'code-symbol',
        symbolName: 'fn',
        symbolKind: 'function',
        startLine: 1,
        endLine: 3,
        signature: 'function fn()',
      },
    ];

    const metrics = calculateKnowledgeMetrics(entries);
    expect(metrics.totalEntries).toBe(2);
    expect(metrics.markdownSectionCount).toBe(1);
    expect(metrics.codeSymbolCount).toBe(1);
  });

  it('sorts entries deterministically by projectId, relativePath, kind, startLine, entryId', () => {
    const entry1: StructuredKnowledgeEntry = {
      entryId: 'p:b.ts#sym:function:z:10',
      projectId: 'p',
      relativePath: 'b.ts',
      kind: 'code-symbol',
      symbolName: 'z',
      symbolKind: 'function',
      startLine: 10,
      endLine: 12,
      signature: 'function z()',
    };
    const entry2: StructuredKnowledgeEntry = {
      entryId: 'p:b.ts#sym:function:a:2',
      projectId: 'p',
      relativePath: 'b.ts',
      kind: 'code-symbol',
      symbolName: 'a',
      symbolKind: 'function',
      startLine: 2,
      endLine: 5,
      signature: 'function a()',
    };
    const entry3: StructuredKnowledgeEntry = {
      entryId: 'p:a.md#sec:1:A:1',
      projectId: 'p',
      relativePath: 'a.md',
      kind: 'markdown-section',
      headingLevel: 1,
      headingText: 'A',
      headingPath: ['A'],
      startLine: 1,
      endLine: 3,
      content: '# A',
    };

    const sorted = sortKnowledgeEntries([entry1, entry2, entry3]);
    expect(sorted.map((e) => e.entryId)).toEqual([
      'p:a.md#sec:1:A:1',
      'p:b.ts#sym:function:a:2',
      'p:b.ts#sym:function:z:10',
    ]);
  });
});

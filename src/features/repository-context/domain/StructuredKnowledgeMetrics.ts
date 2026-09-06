import type { StructuredKnowledgeEntry } from './StructuredKnowledgeIndex';

export type StructuredKnowledgeMetrics = Readonly<{
  totalEntries: number;
  markdownSectionCount: number;
  codeSymbolCount: number;
}>;

export function calculateKnowledgeMetrics(
  entries: readonly StructuredKnowledgeEntry[]
): StructuredKnowledgeMetrics {
  const markdownSectionCount = entries.filter((e) => e.kind === 'markdown-section').length;
  const codeSymbolCount = entries.length - markdownSectionCount;
  return {
    totalEntries: entries.length,
    markdownSectionCount,
    codeSymbolCount,
  };
}

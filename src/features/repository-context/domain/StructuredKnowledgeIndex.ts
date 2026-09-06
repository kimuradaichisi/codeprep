import type { CodeSymbolEntry } from './CodeSymbolEntry';
import type { MarkdownSectionEntry } from './MarkdownSectionEntry';

export type StructuredKnowledgeEntry =
  | MarkdownSectionEntry
  | CodeSymbolEntry;

export type StructuredKnowledgeIndexMetadata = Readonly<{
  projectId: string;
  indexedAt: string;
  schemaVersion: number;
  totalEntries: number;
  markdownSectionCount: number;
  codeSymbolCount: number;
}>;

export type StructuredKnowledgeIndex = Readonly<{
  metadata: StructuredKnowledgeIndexMetadata;
  entries: readonly StructuredKnowledgeEntry[];
}>;

export const CURRENT_KNOWLEDGE_SCHEMA_VERSION = 1;

/**
 * StructuredKnowledgeEntry を決定論的順序でソート
 * projectId ASC -> relativePath ASC -> kind ASC -> startLine ASC -> entryId ASC
 */
export function sortKnowledgeEntries(
  entries: readonly StructuredKnowledgeEntry[]
): readonly StructuredKnowledgeEntry[] {
  return [...entries].sort((a, b) => {
    if (a.projectId !== b.projectId) return a.projectId.localeCompare(b.projectId);
    if (a.relativePath !== b.relativePath) return a.relativePath.localeCompare(b.relativePath);
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    if (a.startLine !== b.startLine) return a.startLine - b.startLine;
    return a.entryId.localeCompare(b.entryId);
  });
}

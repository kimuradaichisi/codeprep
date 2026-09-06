import type { EmbeddingVector } from './EmbeddingVector';

/**
 * セマンティックインデックスのエントリ
 * 本文全文は保持せず、knowledgeEntryId で StructuredKnowledgeIndex を参照する
 */
export type SemanticIndexEntry = Readonly<{
  projectId: string;
  relativePath: string;
  knowledgeEntryId: string;
  knowledgeKind: 'markdown-section' | 'code-symbol';
  vector: EmbeddingVector;
  embeddingTextHash?: string;
}>;

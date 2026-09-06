import type { SemanticIndexEntry } from './SemanticIndexEntry';
export type { SemanticIndexEntry };

export const CURRENT_SEMANTIC_SCHEMA_VERSION = 1;

/**
 * セマンティックインデックスのメタデータ
 * provider, model, dimensions, embeddingTextFormatVersion のいずれかが変化した場合は完全再構築
 */
export type SemanticIndexMetadata = Readonly<{
  workspaceId: string;
  schemaVersion: number;
  sourceKnowledgeSchemaVersion: number;
  embeddingProvider: string;
  embeddingModel: string;
  embeddingDimensions: number;
  embeddingTextFormatVersion: number;
  createdAt: string;
  updatedAt: string;
}>;

/**
 * セマンティックインデックス集約
 */
export type SemanticIndex = Readonly<{
  metadata: SemanticIndexMetadata;
  entries: readonly SemanticIndexEntry[];
}>;

/**
 * 決定論的ソート
 * projectId ASC -> relativePath ASC -> knowledgeEntryId ASC
 */
export function sortSemanticEntries(
  entries: readonly SemanticIndexEntry[]
): readonly SemanticIndexEntry[] {
  return [...entries].sort((a, b) => {
    if (a.projectId !== b.projectId) return a.projectId.localeCompare(b.projectId);
    if (a.relativePath !== b.relativePath) return a.relativePath.localeCompare(b.relativePath);
    return a.knowledgeEntryId.localeCompare(b.knowledgeEntryId);
  });
}

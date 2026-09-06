import {
  CURRENT_SEMANTIC_SCHEMA_VERSION,
  type SemanticIndexMetadata,
} from '../domain/SemanticIndex';
import { CURRENT_EMBEDDING_TEXT_FORMAT_VERSION } from './EmbeddingTextBuilder';
import type { EmbeddingPort } from './semanticIndexPorts';

export function isSemanticMetadataCompatible(
  metadata: SemanticIndexMetadata,
  knowledgeSchemaVersion: number,
  port: EmbeddingPort
): boolean {
  if (metadata.schemaVersion !== CURRENT_SEMANTIC_SCHEMA_VERSION) return false;
  if (metadata.sourceKnowledgeSchemaVersion !== knowledgeSchemaVersion) return false;
  if (metadata.embeddingProvider !== port.providerId) return false;
  if (metadata.embeddingModel !== port.modelId) return false;
  if (metadata.embeddingDimensions !== port.dimensions) return false;
  return metadata.embeddingTextFormatVersion === CURRENT_EMBEDDING_TEXT_FORMAT_VERSION;
}

import type { StructuredKnowledgeIndex } from '../domain/StructuredKnowledgeIndex';
import {
  CURRENT_SEMANTIC_SCHEMA_VERSION,
  sortSemanticEntries,
  type SemanticIndex,
  type SemanticIndexEntry,
  type SemanticIndexMetadata,
} from '../domain/SemanticIndex';
import {
  CURRENT_EMBEDDING_TEXT_FORMAT_VERSION,
  EmbeddingTextBuilder,
} from './EmbeddingTextBuilder';
import { batchEmbed } from './batchEmbedHelper';
import type { EmbeddingPort, SemanticIndexStore } from './semanticIndexPorts';

function buildMetadata(knowledge: StructuredKnowledgeIndex, port: EmbeddingPort): SemanticIndexMetadata {
  const now = new Date().toISOString();
  return {
    workspaceId: knowledge.metadata.projectId,
    schemaVersion: CURRENT_SEMANTIC_SCHEMA_VERSION,
    sourceKnowledgeSchemaVersion: knowledge.metadata.schemaVersion,
    embeddingProvider: port.providerId,
    embeddingModel: port.modelId,
    embeddingDimensions: port.dimensions,
    embeddingTextFormatVersion: CURRENT_EMBEDDING_TEXT_FORMAT_VERSION,
    createdAt: now,
    updatedAt: now,
  };
}

export class BuildSemanticIndexUseCase {
  private readonly textBuilder = new EmbeddingTextBuilder();

  public constructor(
    private readonly embeddingPort: EmbeddingPort,
    private readonly store: SemanticIndexStore,
    private readonly batchSize = 32
  ) {}

  public async execute(knowledgeIndex: StructuredKnowledgeIndex): Promise<SemanticIndex> {
    const entries = await this.buildEntries(knowledgeIndex);
    const sorted = sortSemanticEntries(entries);
    const index: SemanticIndex = {
      metadata: buildMetadata(knowledgeIndex, this.embeddingPort),
      entries: sorted,
    };
    await this.store.save(index);
    return index;
  }

  private async buildEntries(
    knowledgeIndex: StructuredKnowledgeIndex
  ): Promise<SemanticIndexEntry[]> {
    const kEntries = knowledgeIndex.entries;
    const texts = kEntries.map((e) => this.textBuilder.build(e));
    const vectors = await batchEmbed(this.embeddingPort, texts, this.batchSize);
    return kEntries.map((kEntry, i) => ({
      projectId: kEntry.projectId,
      relativePath: kEntry.relativePath,
      knowledgeEntryId: kEntry.entryId,
      knowledgeKind: kEntry.kind,
      vector: vectors[i],
    }));
  }
}

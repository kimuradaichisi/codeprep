import type { RepositoryIndexChangeSet } from '../domain/RepositoryIndexChangeSet';
import type {
  StructuredKnowledgeEntry,
  StructuredKnowledgeIndex,
} from '../domain/StructuredKnowledgeIndex';
import {
  sortSemanticEntries,
  type SemanticIndex,
  type SemanticIndexEntry,
} from '../domain/SemanticIndex';
import type { BuildSemanticIndexUseCase } from './BuildSemanticIndexUseCase';
import { EmbeddingTextBuilder } from './EmbeddingTextBuilder';
import { batchEmbed } from './batchEmbedHelper';
import { isSemanticMetadataCompatible } from './semanticMetadataValidator';
import type { EmbeddingPort, SemanticIndexStore } from './semanticIndexPorts';

export class RefreshSemanticIndexUseCase {
  private readonly textBuilder = new EmbeddingTextBuilder();

  public constructor(
    private readonly embeddingPort: EmbeddingPort,
    private readonly store: SemanticIndexStore,
    private readonly buildUseCase: BuildSemanticIndexUseCase,
    private readonly batchSize = 32
  ) {}

  public async execute(
    workspaceId: string,
    currentKnowledge: StructuredKnowledgeIndex,
    changeSet: RepositoryIndexChangeSet
  ): Promise<SemanticIndex> {
    const existing = await this.store.load(workspaceId);
    if (!existing || !isSemanticMetadataCompatible(existing.metadata, currentKnowledge.metadata.schemaVersion, this.embeddingPort)) {
      return this.buildUseCase.execute(currentKnowledge);
    }
    return this.refreshIncremental(workspaceId, existing, currentKnowledge, changeSet);
  }

  private async refreshIncremental(
    workspaceId: string,
    existing: SemanticIndex,
    currentKnowledge: StructuredKnowledgeIndex,
    changeSet: RepositoryIndexChangeSet
  ): Promise<SemanticIndex> {
    const retained = this.filterRetained(existing.entries, changeSet);
    const newEntries = await this.embedChanged(currentKnowledge, changeSet);
    const merged = sortSemanticEntries([...retained, ...newEntries]);
    const refreshed: SemanticIndex = {
      metadata: { ...existing.metadata, updatedAt: new Date().toISOString() },
      entries: merged,
    };
    await this.store.save(refreshed);
    return refreshed;
  }

  private filterRetained(
    entries: readonly SemanticIndexEntry[],
    changeSet: RepositoryIndexChangeSet
  ): SemanticIndexEntry[] {
    const invalid = new Set([...changeSet.deleted, ...changeSet.modified].map((e) => e.relativePath));
    return entries.filter((e) => !invalid.has(e.relativePath));
  }

  private async embedChanged(
    currentKnowledge: StructuredKnowledgeIndex,
    changeSet: RepositoryIndexChangeSet
  ): Promise<SemanticIndexEntry[]> {
    const targets = this.filterChangedTargets(currentKnowledge, changeSet);
    if (targets.length === 0) return [];
    const texts = targets.map((e) => this.textBuilder.build(e));
    const vectors = await batchEmbed(this.embeddingPort, texts, this.batchSize);
    return targets.map((kEntry, i) => ({
      projectId: kEntry.projectId,
      relativePath: kEntry.relativePath,
      knowledgeEntryId: kEntry.entryId,
      knowledgeKind: kEntry.kind,
      vector: vectors[i],
    }));
  }

  private filterChangedTargets(
    currentKnowledge: StructuredKnowledgeIndex,
    changeSet: RepositoryIndexChangeSet
  ): StructuredKnowledgeEntry[] {
    const targetPaths = new Set([...changeSet.added, ...changeSet.modified].map((e) => e.relativePath));
    return targetPaths.size > 0
      ? currentKnowledge.entries.filter((e) => targetPaths.has(e.relativePath))
      : [];
  }
}

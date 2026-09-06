import type { RepositoryIndex } from '../domain/RepositoryIndex';
import type { RepositoryIndexChangeSet } from '../domain/RepositoryIndexChangeSet';
import {
  CURRENT_KNOWLEDGE_SCHEMA_VERSION,
  sortKnowledgeEntries,
  type StructuredKnowledgeEntry,
  type StructuredKnowledgeIndex,
} from '../domain/StructuredKnowledgeIndex';
import { calculateKnowledgeMetrics } from '../domain/StructuredKnowledgeMetrics';
import type { BuildStructuredKnowledgeIndexUseCase } from './BuildStructuredKnowledgeIndexUseCase';
import type { KnowledgeExtractionService } from './KnowledgeExtractionService';
import type { StructuredKnowledgeIndexStore } from './structuredKnowledgePorts';

export class RefreshStructuredKnowledgeIndexUseCase {
  public constructor(
    private readonly extractorService: KnowledgeExtractionService,
    private readonly store: StructuredKnowledgeIndexStore,
    private readonly buildUseCase: BuildStructuredKnowledgeIndexUseCase
  ) {}

  public async execute(
    projectId: string,
    changeSet: RepositoryIndexChangeSet,
    fullIndex?: RepositoryIndex
  ): Promise<StructuredKnowledgeIndex> {
    const existing = await this.store.load(projectId);
    if (!existing || existing.metadata.schemaVersion !== CURRENT_KNOWLEDGE_SCHEMA_VERSION) {
      if (fullIndex) return this.buildUseCase.execute(fullIndex);
      throw new Error(`Cannot refresh structured knowledge index without fullIndex: ${projectId}`);
    }
    return this.refreshIncremental(projectId, changeSet, existing);
  }

  private async refreshIncremental(
    projectId: string,
    changeSet: RepositoryIndexChangeSet,
    existing: StructuredKnowledgeIndex
  ): Promise<StructuredKnowledgeIndex> {
    const retained = this.filterRetained(existing.entries, changeSet);
    const newEntries = await this.extractNewEntries(projectId, changeSet);
    const refreshed = this.buildRefreshed(projectId, [...retained, ...newEntries]);
    await this.store.save(refreshed);
    return refreshed;
  }

  private filterRetained(
    entries: readonly StructuredKnowledgeEntry[],
    changeSet: RepositoryIndexChangeSet
  ): StructuredKnowledgeEntry[] {
    const deletedPaths = new Set(changeSet.deleted.map((e) => e.relativePath));
    const modifiedPaths = new Set(changeSet.modified.map((e) => e.relativePath));
    return entries.filter(
      (e) => !deletedPaths.has(e.relativePath) && !modifiedPaths.has(e.relativePath)
    );
  }

  private async extractNewEntries(
    projectId: string,
    changeSet: RepositoryIndexChangeSet
  ): Promise<StructuredKnowledgeEntry[]> {
    const targets = [...changeSet.added, ...changeSet.modified];
    const newEntries: StructuredKnowledgeEntry[] = [];
    for (const entry of targets) {
      const extracted = await this.extractorService.extractForFile(entry.projectId, entry.relativePath);
      for (const item of extracted) {
        newEntries.push(item);
      }
    }
    return newEntries;
  }

  private buildRefreshed(
    projectId: string,
    allEntries: StructuredKnowledgeEntry[]
  ): StructuredKnowledgeIndex {
    const sorted = sortKnowledgeEntries(allEntries);
    const metrics = calculateKnowledgeMetrics(sorted);
    return {
      metadata: {
        projectId,
        indexedAt: new Date().toISOString(),
        schemaVersion: CURRENT_KNOWLEDGE_SCHEMA_VERSION,
        ...metrics,
      },
      entries: sorted,
    };
  }
}

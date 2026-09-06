import type { RepositoryIndex } from '../domain/RepositoryIndex';
import {
  CURRENT_KNOWLEDGE_SCHEMA_VERSION,
  sortKnowledgeEntries,
  type StructuredKnowledgeEntry,
  type StructuredKnowledgeIndex,
} from '../domain/StructuredKnowledgeIndex';
import { calculateKnowledgeMetrics } from '../domain/StructuredKnowledgeMetrics';
import type { KnowledgeExtractionService } from './KnowledgeExtractionService';
import type { StructuredKnowledgeIndexStore } from './structuredKnowledgePorts';

export class BuildStructuredKnowledgeIndexUseCase {
  public constructor(
    private readonly extractorService: KnowledgeExtractionService,
    private readonly store: StructuredKnowledgeIndexStore
  ) {}

  public async execute(repositoryIndex: RepositoryIndex): Promise<StructuredKnowledgeIndex> {
    const projectId = repositoryIndex.metadata.workspaceId;
    const allEntries = await this.collectEntries(projectId, repositoryIndex);
    const index = this.createIndex(projectId, allEntries);
    await this.store.save(index);
    return index;
  }

  private async collectEntries(
    projectId: string,
    repositoryIndex: RepositoryIndex
  ): Promise<StructuredKnowledgeEntry[]> {
    const entries: StructuredKnowledgeEntry[] = [];
    for (const fileEntry of repositoryIndex.entries) {
      const extracted = await this.extractorService.extractForFile(fileEntry.projectId, fileEntry.relativePath);
      for (const item of extracted) {
        entries.push(item);
      }
    }
    return entries;
  }

  private createIndex(
    projectId: string,
    entries: StructuredKnowledgeEntry[]
  ): StructuredKnowledgeIndex {
    const sortedEntries = sortKnowledgeEntries(entries);
    const metrics = calculateKnowledgeMetrics(sortedEntries);
    return {
      metadata: {
        projectId,
        indexedAt: new Date().toISOString(),
        schemaVersion: CURRENT_KNOWLEDGE_SCHEMA_VERSION,
        ...metrics,
      },
      entries: sortedEntries,
    };
  }
}

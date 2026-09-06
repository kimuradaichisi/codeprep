import { cosineSimilarity } from '../domain/cosineSimilarity';
import type { EmbeddingVector } from '../domain/EmbeddingVector';
import type { SemanticIndexEntry } from '../domain/SemanticIndexEntry';
import { EmbeddingTextBuilder } from './EmbeddingTextBuilder';
import type { EmbeddingPort, SemanticIndexStore } from './semanticIndexPorts';

export type SemanticSearchInput = Readonly<{
  workspaceId: string;
  projectId?: string;
  query: string;
  topK?: number;
  minScore?: number;
}>;

export type SemanticSearchHit = Readonly<{
  projectId: string;
  relativePath: string;
  knowledgeEntryId: string;
  knowledgeKind: 'markdown-section' | 'code-symbol';
  score: number;
}>;

function tryScore(
  e: SemanticIndexEntry,
  queryVec: EmbeddingVector,
  minScore: number
): SemanticSearchHit | null {
  const score = cosineSimilarity(queryVec, e.vector);
  if (score < minScore) return null;
  return {
    projectId: e.projectId,
    relativePath: e.relativePath,
    knowledgeEntryId: e.knowledgeEntryId,
    knowledgeKind: e.knowledgeKind,
    score,
  };
}

export class SemanticSearchUseCase {
  private readonly textBuilder = new EmbeddingTextBuilder();

  public constructor(
    private readonly embeddingPort: EmbeddingPort,
    private readonly store: SemanticIndexStore
  ) {}

  public async execute(input: SemanticSearchInput): Promise<readonly SemanticSearchHit[]> {
    const index = await this.store.load(input.workspaceId);
    if (!index || index.entries.length === 0) return [];

    const queryText = this.textBuilder.buildQuery(input.query);
    const [queryVec] = await this.embeddingPort.embed([queryText]);
    const topK = input.topK ?? 10;
    const minScore = input.minScore ?? 0.55;

    const scored = this.scoreEntries(index.entries, queryVec, input.projectId, minScore);
    scored.sort((a, b) => this.compareHits(a, b));
    return scored.slice(0, topK);
  }

  private scoreEntries(
    entries: readonly SemanticIndexEntry[],
    queryVec: EmbeddingVector,
    filterProj: string | undefined,
    minScore: number
  ): SemanticSearchHit[] {
    const hits: SemanticSearchHit[] = [];
    for (const e of entries) {
      if (filterProj && e.projectId !== filterProj) continue;
      const hit = tryScore(e, queryVec, minScore);
      if (hit) hits.push(hit);
    }
    return hits;
  }

  private compareHits(a: SemanticSearchHit, b: SemanticSearchHit): number {
    if (b.score !== a.score) return b.score - a.score;
    if (a.relativePath !== b.relativePath) return a.relativePath.localeCompare(b.relativePath);
    return a.knowledgeEntryId.localeCompare(b.knowledgeEntryId);
  }
}

import type { EntryPointCandidateEvidence } from '../domain/EntryPointCandidate';
import type { Project } from '../domain/Project';
import type { EntryPointCandidateSource } from './entryPointCandidatePorts';
import type { SemanticSearchHit, SemanticSearchUseCase } from './SemanticSearchUseCase';

export interface SemanticCandidateSourceOptions {
  readonly minScore?: number;
  readonly topK?: number;
}

function resolveQuery(terms: readonly string[], taskQuery?: string): string {
  return taskQuery?.trim() || terms.join(' ').trim();
}

function extractBestPaths(projectId: string, hits: readonly SemanticSearchHit[]): string[] {
  const seen = new Set<string>();
  for (const hit of hits) {
    if (hit.projectId === projectId) seen.add(hit.relativePath);
  }
  return Array.from(seen);
}

function hitsToEvidences(projectId: string, hits: readonly SemanticSearchHit[]): EntryPointCandidateEvidence[] {
  return extractBestPaths(projectId, hits).map((relativePath) => ({
    projectId,
    relativePath,
    reason: 'semanticMatch',
  }));
}

export class SemanticEntryPointCandidateSource implements EntryPointCandidateSource {
  public constructor(
    private readonly searchUseCase: SemanticSearchUseCase,
    private readonly workspaceId = 'default',
    private readonly options?: SemanticCandidateSourceOptions
  ) {}

  public async discover(
    project: Project,
    terms: readonly string[],
    taskQuery?: string
  ): Promise<readonly EntryPointCandidateEvidence[]> {
    const query = resolveQuery(terms, taskQuery);
    if (!query) return [];
    try {
      const hits = await this.executeSearch(project.id, query);
      return hitsToEvidences(project.id, hits);
    } catch {
      return [];
    }
  }

  private executeSearch(projectId: string, query: string): Promise<readonly SemanticSearchHit[]> {
    return this.searchUseCase.execute({
      workspaceId: this.workspaceId,
      projectId,
      query,
      topK: this.options?.topK ?? 10,
      minScore: this.options?.minScore ?? 0.55,
    });
  }
}

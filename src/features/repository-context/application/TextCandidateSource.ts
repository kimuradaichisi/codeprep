// src/features/repository-context/application/TextCandidateSource.ts
import type { Project } from '../domain/Project';
import type { EntryPointCandidateEvidence } from '../domain/EntryPointCandidate';
import type { EntryPointCandidateSource } from './entryPointCandidatePorts';
import type { RipgrepPort } from './ports';

export class TextCandidateSource implements EntryPointCandidateSource {
  constructor(private readonly ripgrep?: RipgrepPort) {}

  async discover(project: Project, terms: readonly string[]): Promise<readonly EntryPointCandidateEvidence[]> {
    if (!this.ripgrep || terms.length === 0) return Object.freeze([]);

    const evidences: EntryPointCandidateEvidence[] = [];
    for (const term of terms) {
      await this.searchSingleTerm(project, term, evidences);
    }
    return Object.freeze(evidences);
  }

  private async searchSingleTerm(
    project: Project,
    term: string,
    out: EntryPointCandidateEvidence[]
  ): Promise<void> {
    try {
      const result = await this.ripgrep!.search(project, term, 0);
      this.collectMatches(project.id, term, result.matches, out);
    } catch {
      // Partial failure tolerance
    }
  }

  private collectMatches(
    projectId: string,
    term: string,
    matches: readonly { relativePath: string }[],
    out: EntryPointCandidateEvidence[]
  ): void {
    for (const match of matches) {
      out.push({ projectId, relativePath: match.relativePath, reason: 'textMatch', matchedTerm: term });
    }
  }
}

// src/features/repository-context/application/SymbolCandidateSource.ts
import type { Project } from '../domain/Project';
import type { EntryPointCandidateEvidence } from '../domain/EntryPointCandidate';
import type { EntryPointCandidateSource } from './entryPointCandidatePorts';
import type { RipgrepPort } from './ports';

export class SymbolCandidateSource implements EntryPointCandidateSource {
  constructor(private readonly ripgrep?: RipgrepPort) {}

  async discover(project: Project, terms: readonly string[]): Promise<readonly EntryPointCandidateEvidence[]> {
    if (!this.ripgrep || terms.length === 0) return Object.freeze([]);

    const evidences: EntryPointCandidateEvidence[] = [];
    const validTerms = terms.filter((t) => /^[a-zA-Z0-9_]+$/.test(t) && t.length >= 3);

    for (const term of validTerms) {
      await this.searchSymbol(project, term, evidences);
    }
    return Object.freeze(evidences);
  }

  private async searchSymbol(
    project: Project,
    term: string,
    out: EntryPointCandidateEvidence[]
  ): Promise<void> {
    try {
      const pattern = `(?:class|interface|function|type|const|enum|def|fn)\\s+${term}\\b`;
      const result = await this.ripgrep!.search(project, pattern, 0);
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
      out.push({ projectId, relativePath: match.relativePath, reason: 'symbolLikeMatch', matchedTerm: term });
    }
  }
}

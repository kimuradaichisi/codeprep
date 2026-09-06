// src/features/repository-context/application/FilenameAndPathCandidateSource.ts
import type { Project } from '../domain/Project';
import type { EntryPointCandidateEvidence } from '../domain/EntryPointCandidate';
import type { EntryPointCandidateSource } from './entryPointCandidatePorts';
import type { ProjectFilePort } from './ports';

export class FilenameAndPathCandidateSource implements EntryPointCandidateSource {
  constructor(private readonly filePort: ProjectFilePort) {}

  async discover(project: Project, terms: readonly string[]): Promise<readonly EntryPointCandidateEvidence[]> {
    const files = await this.filePort.list(project);
    const evidences: EntryPointCandidateEvidence[] = [];

    for (const file of files) {
      this.evaluateFile(project.id, file.relativePath, terms, evidences);
    }
    return Object.freeze(evidences);
  }

  private evaluateFile(
    projectId: string,
    relativePath: string,
    terms: readonly string[],
    out: EntryPointCandidateEvidence[]
  ): void {
    const info = this.resolvePathInfo(relativePath);
    for (const term of terms) {
      this.matchTerm(projectId, relativePath, info, term, out);
    }
  }

  private resolvePathInfo(relativePath: string) {
    const base = (relativePath.split('/').pop() ?? relativePath).toLowerCase();
    const name = base.replace(/\.[^/.]+$/, '');
    return { base, name, path: relativePath.toLowerCase() };
  }

  private matchTerm(
    projectId: string,
    relativePath: string,
    info: { base: string; name: string; path: string },
    term: string,
    out: EntryPointCandidateEvidence[]
  ): void {
    const lower = term.toLowerCase();
    if (info.base === lower || info.name === lower) {
      out.push({ projectId, relativePath, reason: 'exactFilenameMatch', matchedTerm: term });
    } else if (info.base.includes(lower)) {
      out.push({ projectId, relativePath, reason: 'filenameMatch', matchedTerm: term });
    } else if (info.path.includes(lower)) {
      out.push({ projectId, relativePath, reason: 'pathMatch', matchedTerm: term });
    }
  }
}

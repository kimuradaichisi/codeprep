// src/features/repository-context/application/HeadingCandidateSource.ts
import type { Project } from '../domain/Project';
import type { EntryPointCandidateEvidence } from '../domain/EntryPointCandidate';
import type { EntryPointCandidateSource } from './entryPointCandidatePorts';
import type { FileContentPort, ProjectFilePort } from './ports';

const HEADING_REGEX = /^#{1,6}\s+(.+)$/gm;

export class HeadingCandidateSource implements EntryPointCandidateSource {
  constructor(
    private readonly filePort: ProjectFilePort,
    private readonly contentPort?: FileContentPort
  ) {}

  async discover(project: Project, terms: readonly string[]): Promise<readonly EntryPointCandidateEvidence[]> {
    if (!this.contentPort || terms.length === 0) return Object.freeze([]);

    const files = await this.filePort.list(project);
    const mdFiles = files.filter((f) => f.relativePath.toLowerCase().endsWith('.md'));
    const evidences: EntryPointCandidateEvidence[] = [];

    for (const file of mdFiles) {
      await this.inspectMarkdown(project, file.relativePath, terms, evidences);
    }
    return Object.freeze(evidences);
  }

  private async inspectMarkdown(
    project: Project,
    relativePath: string,
    terms: readonly string[],
    out: EntryPointCandidateEvidence[]
  ): Promise<void> {
    try {
      const content = await this.contentPort!.read(project, relativePath);
      if (!content) return;
      const headings = this.extractHeadings(content);
      this.matchHeadings(project.id, relativePath, headings, terms, out);
    } catch {
      // Partial failure tolerance
    }
  }

  private extractHeadings(content: string): readonly string[] {
    const headings: string[] = [];
    let match: RegExpExecArray | null = null;
    const regex = new RegExp(HEADING_REGEX);
    while ((match = regex.exec(content)) !== null) {
      if (match[1]?.trim()) headings.push(match[1].trim().toLowerCase());
    }
    return headings;
  }

  private matchHeadings(
    projectId: string,
    relativePath: string,
    headings: readonly string[],
    terms: readonly string[],
    out: EntryPointCandidateEvidence[]
  ): void {
    for (const term of terms) {
      const lowerTerm = term.toLowerCase();
      const hasMatch = headings.some((h) => h.includes(lowerTerm));
      if (hasMatch) {
        out.push({ projectId, relativePath, reason: 'headingMatch', matchedTerm: term });
      }
    }
  }
}

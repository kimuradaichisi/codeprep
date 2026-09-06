// src/features/repository-context/application/DiscoverEntryPointCandidatesUseCase.ts
import type { Project } from '../domain/Project';
import type { EntryPointCandidateEvidence } from '../domain/EntryPointCandidate';
import { extractTaskSearchTerms } from '../domain/TaskSearchTermExtractor';
import { filterEntryPointCandidates, mergeCandidateEvidences } from '../domain/EntryPointCandidateScorer';
import type {
  DiscoverEntryPointCandidatesInput,
  DiscoverEntryPointCandidatesPorts,
  DiscoverEntryPointCandidatesResult,
  EntryPointCandidateSource,
} from './entryPointCandidatePorts';
import { FilenameAndPathCandidateSource } from './FilenameAndPathCandidateSource';
import { TextCandidateSource } from './TextCandidateSource';
import { HeadingCandidateSource } from './HeadingCandidateSource';
import { SymbolCandidateSource } from './SymbolCandidateSource';

export class DiscoverEntryPointCandidatesUseCase {
  private readonly defaultSources: readonly EntryPointCandidateSource[];

  constructor(private readonly ports: DiscoverEntryPointCandidatesPorts) {
    this.defaultSources = Object.freeze([
      new FilenameAndPathCandidateSource(ports.files),
      new TextCandidateSource(ports.ripgrep),
      new HeadingCandidateSource(ports.files, ports.fileContent),
      new SymbolCandidateSource(ports.ripgrep),
    ]);
  }

  async execute(input: DiscoverEntryPointCandidatesInput): Promise<DiscoverEntryPointCandidatesResult> {
    const trimmedTask = input.task.trim();
    if (!trimmedTask) return { candidates: [], terms: [], warnings: [] };

    const terms = extractTaskSearchTerms(trimmedTask);
    const projects = await this.ports.projects.getByIds(input.projectIds ?? []);
    if (projects.length === 0) return { candidates: [], terms, warnings: [] };

    const evidences = await this.collectAllEvidences(projects, terms, trimmedTask, input.manualPinnedPaths);
    const merged = mergeCandidateEvidences(evidences, input.customWeights);
    const filtered = filterEntryPointCandidates(merged, input.maxCandidates ?? 20);

    return { candidates: filtered, terms, warnings: [] };
  }

  private async collectAllEvidences(
    projects: readonly Project[],
    terms: readonly string[],
    task: string,
    manualPins?: readonly string[]
  ): Promise<readonly EntryPointCandidateEvidence[]> {
    const sources = [...this.defaultSources, ...(this.ports.customSources ?? [])];
    const evidences: EntryPointCandidateEvidence[] = [];
    this.appendManualPins(projects, manualPins, evidences);
    await this.collectFromProjects(projects, sources, terms, task, evidences);
    return evidences;
  }

  private async collectFromProjects(
    projects: readonly Project[],
    sources: readonly EntryPointCandidateSource[],
    terms: readonly string[],
    task: string,
    out: EntryPointCandidateEvidence[]
  ): Promise<void> {
    for (const project of projects) {
      for (const source of sources) {
        await this.safeDiscover(source, project, terms, task, out);
      }
    }
  }

  private appendManualPins(
    projects: readonly Project[],
    pins: readonly string[] | undefined,
    out: EntryPointCandidateEvidence[]
  ): void {
    if (!pins || pins.length === 0) return;
    for (const project of projects) {
      for (const pin of pins) {
        out.push({ projectId: project.id, relativePath: pin, reason: 'manualPin' });
      }
    }
  }

  private async safeDiscover(
    source: EntryPointCandidateSource,
    project: Project,
    terms: readonly string[],
    task: string,
    out: EntryPointCandidateEvidence[]
  ): Promise<void> {
    try {
      const found = await source.discover(project, terms, task);
      out.push(...found);
    } catch {
      // Partial failure is tolerated
    }
  }
}

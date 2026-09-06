// src/features/repository-context/application/EnrichEntryPointCandidatesUseCase.ts
import type { EnrichedEntryPointCandidate } from '../domain/CandidateEvidence';
import { calculateCandidateSupportScore } from '../domain/CandidateSupportScorer';
import type { EntryPointCandidate } from '../domain/EntryPointCandidate';
import type { Project } from '../domain/Project';
import type { CandidateEvidencePorts, EnrichCandidatesOptions } from './candidateEvidencePorts';
import { CollectCandidateEvidenceUseCase } from './CollectCandidateEvidenceUseCase';

export type EnrichEntryPointCandidatesInput = Readonly<{
  task: string;
  projectIds: readonly string[];
  candidates: readonly EntryPointCandidate[];
  options?: EnrichCandidatesOptions;
}>;

const fallbackCandidate = (candidate: EntryPointCandidate): EnrichedEntryPointCandidate => ({
  candidate,
  evidence: [],
  supportScore: 0,
});

export class EnrichEntryPointCandidatesUseCase {
  private readonly collector: CollectCandidateEvidenceUseCase;

  constructor(private readonly ports: CandidateEvidencePorts) {
    this.collector = new CollectCandidateEvidenceUseCase(ports);
  }

  async execute(input: EnrichEntryPointCandidatesInput): Promise<readonly EnrichedEntryPointCandidate[]> {
    if (input.candidates.length === 0) return [];
    const projectMap = await this.getProjectMap(input.projectIds);
    return this.enrichList(input.task, input.candidates, projectMap, input.options?.enrichTopN ?? 5);
  }

  private async getProjectMap(ids: readonly string[]): Promise<Map<string, Project>> {
    const projects = await this.ports.projects.getByIds(ids);
    return new Map(projects.map((p) => [p.id, p]));
  }

  private async enrichList(
    task: string,
    candidates: readonly EntryPointCandidate[],
    projectMap: Map<string, Project>,
    topN: number
  ): Promise<readonly EnrichedEntryPointCandidate[]> {
    const result: EnrichedEntryPointCandidate[] = [];
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      const project = projectMap.get(candidate.projectId);
      const item = i < topN ? await this.enrichSingle(task, candidate, project) : fallbackCandidate(candidate);
      result.push(item);
    }
    return result;
  }

  private async enrichSingle(
    task: string,
    candidate: EntryPointCandidate,
    project?: Project
  ): Promise<EnrichedEntryPointCandidate> {
    if (!project) return fallbackCandidate(candidate);
    try {
      const bundle = await this.collector.execute({ task, project, candidate });
      const supportScore = calculateCandidateSupportScore(bundle.evidence);
      return { candidate, evidence: bundle.evidence, supportScore };
    } catch {
      return fallbackCandidate(candidate);
    }
  }
}

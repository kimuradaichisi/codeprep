// src/features/repository-context/application/CollectCandidateEvidenceUseCase.ts
import type {
  CandidateEvidenceBundle,
} from '../domain/CandidateEvidence';
import { deduplicateCandidateEvidences } from '../domain/CandidateEvidence';
import type { EntryPointCandidate } from '../domain/EntryPointCandidate';
import type { Project } from '../domain/Project';
import type { StructuredKnowledgeIndex } from '../domain/StructuredKnowledgeIndex';
import type { CandidateEvidencePorts } from './candidateEvidencePorts';
import {
  extractDependencyEvidences,
  extractRecommendationEvidences,
  extractRelatedTestEvidences,
  extractSymbolSupportEvidences,
} from './CandidateEvidenceExtractors';

export type CollectCandidateEvidenceInput = Readonly<{
  task: string;
  project: Project;
  candidate: EntryPointCandidate;
  allFiles?: readonly Readonly<{ relativePath: string; size: number }>[];
  knowledgeIndex?: StructuredKnowledgeIndex;
}>;

export class CollectCandidateEvidenceUseCase {
  constructor(private readonly ports: CandidateEvidencePorts) {}

  async execute(input: CollectCandidateEvidenceInput): Promise<CandidateEvidenceBundle> {
    const allFiles = input.allFiles ?? (await this.ports.files.list(input.project));
    const knowledge = input.knowledgeIndex ?? (await this.loadKnowledge(input.project.id));
    return this.collectAll(input.task, input.project, input.candidate, allFiles, knowledge);
  }

  private async collectAll(
    task: string,
    project: Project,
    cand: EntryPointCandidate,
    allFiles: readonly Readonly<{ relativePath: string; size: number }>[],
    knowledge?: StructuredKnowledgeIndex
  ): Promise<CandidateEvidenceBundle> {
    const depEv = await extractDependencyEvidences(project, cand, this.ports.fileContent, this.ports.dependencyScanner);
    const testEv = extractRelatedTestEvidences(project, cand, allFiles);
    const recRes = await extractRecommendationEvidences(project, cand, this.ports.recommendations);
    const symEv = extractSymbolSupportEvidences(project, cand, task, knowledge);
    const evidence = deduplicateCandidateEvidences([...depEv, ...testEv, ...recRes.evidences, ...symEv]);
    return { projectId: project.id, candidatePath: cand.relativePath, evidence, diagnostics: recRes.diagnostics };
  }

  private async loadKnowledge(projectId: string): Promise<StructuredKnowledgeIndex | undefined> {
    if (!this.ports.knowledgeIndexStore) return undefined;
    try {
      return (await this.ports.knowledgeIndexStore.load(projectId)) ?? undefined;
    } catch {
      return undefined;
    }
  }
}

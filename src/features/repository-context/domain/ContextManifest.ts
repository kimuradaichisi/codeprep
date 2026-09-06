// src/features/repository-context/domain/ContextManifest.ts
import type { ProjectId } from './Project';
import type { ContextBudget } from './ContextBudget';
import type { ContextEntry } from './ContextEntry';
import type { CandidateEvidence } from './CandidateEvidence';

export type ContextManifest = Readonly<{
  projectId: ProjectId;
  task: string;
  entryPoints: readonly string[];
  entries: readonly ContextEntry[];
  budget: ContextBudget;
  evidences?: readonly CandidateEvidence[];
}>;

export const createContextManifest = (
  projectId: ProjectId,
  task: string,
  entryPoints: readonly string[],
  entries: readonly ContextEntry[],
  budget: ContextBudget,
  evidences?: readonly CandidateEvidence[]
): ContextManifest => Object.freeze({
  projectId,
  task,
  entryPoints: Object.freeze([...entryPoints]),
  entries: Object.freeze([...entries]),
  budget,
  ...(evidences && evidences.length > 0 ? { evidences: Object.freeze([...evidences]) } : {}),
});

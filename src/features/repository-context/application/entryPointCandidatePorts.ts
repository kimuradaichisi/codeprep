// src/features/repository-context/application/entryPointCandidatePorts.ts
import type { Project, ProjectId } from '../domain/Project';
import type {
  EntryPointCandidate,
  EntryPointCandidateEvidence,
} from '../domain/EntryPointCandidate';
import type {
  AnalysisWarning,
  FileContentPort,
  ProjectFilePort,
  ProjectRegistryPort,
  RipgrepPort,
} from './ports';

export interface EntryPointCandidateSource {
  discover(
    project: Project,
    terms: readonly string[]
  ): Promise<readonly EntryPointCandidateEvidence[]>;
}

export type DiscoverEntryPointCandidatesInput = Readonly<{
  task: string;
  projectIds?: readonly ProjectId[];
  maxCandidates?: number;
  manualPinnedPaths?: readonly string[];
}>;

export type DiscoverEntryPointCandidatesResult = Readonly<{
  candidates: readonly EntryPointCandidate[];
  terms: readonly string[];
  warnings: readonly AnalysisWarning[];
}>;

export type DiscoverEntryPointCandidatesPorts = Readonly<{
  projects: ProjectRegistryPort;
  files: ProjectFilePort;
  ripgrep?: RipgrepPort;
  fileContent?: FileContentPort;
  customSources?: readonly EntryPointCandidateSource[];
}>;

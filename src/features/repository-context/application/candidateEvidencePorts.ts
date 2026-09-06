// src/features/repository-context/application/candidateEvidencePorts.ts
import type { DependencyScanner } from '../../engine/application/DependencyScanner';
import type { StructuredKnowledgeIndexStore } from './structuredKnowledgePorts';
import type {
  FileContentPort,
  ProjectFilePort,
  ProjectRegistryPort,
  RecommendationSourcePorts,
} from './ports';

export type CandidateEvidencePorts = Readonly<{
  projects: ProjectRegistryPort;
  files: ProjectFilePort;
  fileContent: FileContentPort;
  dependencyScanner: DependencyScanner;
  recommendations?: RecommendationSourcePorts;
  knowledgeIndexStore?: StructuredKnowledgeIndexStore;
}>;

export type EnrichCandidatesOptions = Readonly<{
  enrichTopN?: number;
  maxConcurrency?: number;
}>;

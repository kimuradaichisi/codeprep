// src/features/repository-context/application/discoverFilesPorts.ts
import type { Project, ProjectId } from '../domain/Project';
import type { SearchRecipe } from '../domain/SearchRecipe';
import type {
  RecommendationRecord,
  RecommendationSettings,
  RecommendationSource,
} from '../domain/Recommendation';
import type { DependencyScanner } from '../../engine/application/DependencyScanner';
import type {
  ProjectRegistryPort,
  RipgrepPort,
  GitMetadataPort,
  ProjectFilePort,
  ClipboardPathPort,
  GitHistoryPort,
  FileSizePort,
  FileContentPort,
} from './ports';

export type DocGraphRelation = Readonly<{
  path: string;
  reason: string;
  confidence: number;
}>;

export type DocGraphPort = Readonly<{
  findRelated(project: Project, relativePath: string): Promise<readonly DocGraphRelation[]>;
}>;

export type RecommendFilesInput = Readonly<{
  projectIds: readonly ProjectId[];
  relativePaths: readonly string[];
  settings: RecommendationSettings;
}>;

export type RecommendationSourcePort = Readonly<{
  recommend(project: Project, relativePath: string): Promise<readonly RecommendationRecord[]>;
}>;

export type RecommendationSourcePorts = Readonly<
  Partial<Record<RecommendationSource, RecommendationSourcePort>>
>;

export type DiscoverFilesInput = Readonly<{
  recipe: SearchRecipe;
  projectIds: readonly ProjectId[];
  recommendationSettings?: RecommendationSettings;
}>;

export type DiscoverFilesPorts = Readonly<{
  projects: ProjectRegistryPort;
  ripgrep: RipgrepPort;
  gitMetadata: GitMetadataPort;
  files: ProjectFilePort;
  clipboard: ClipboardPathPort;
  gitHistory: GitHistoryPort;
  fileSize: FileSizePort;
  fileContent: FileContentPort;
  dependencyScanner: DependencyScanner;
  docGraph: DocGraphPort;
  recommendations?: RecommendationSourcePorts;
}>;

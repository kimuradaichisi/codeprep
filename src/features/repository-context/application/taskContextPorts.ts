import type { TaskContext } from '../domain/TaskContext';
import type { ContextManifest } from '../domain/ContextManifest';
import type { AdaptivePackMode } from '../domain/ContextConfidence';
import type { AnalysisWarning, FileContentPort, ProjectFilePort, ProjectRegistryPort, RecommendationSourcePorts } from './ports';
import type { DependencyScanner } from '../../engine/application/DependencyScanner';

export type BuildTaskContextInput = Readonly<{
  taskContext: TaskContext;
  tokenLimit?: number;
  strategy?: AdaptivePackMode;
}>;

export type BuildTaskContextResult = Readonly<{
  manifest: ContextManifest;
  warnings: readonly AnalysisWarning[];
}>;

export type BuildTaskContextPorts = Readonly<{
  projects: ProjectRegistryPort;
  files: ProjectFilePort;
  fileContent: FileContentPort;
  dependencyScanner?: DependencyScanner;
  recommendations?: RecommendationSourcePorts;
}>;

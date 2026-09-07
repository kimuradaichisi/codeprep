// src/features/repository-context/application/buildContextPorts.ts
import type { CandidateFile } from '../domain/CandidateFile';
import type { ProjectId } from '../domain/Project';
import type { PackMode } from '../domain/PackMode';
import type { ContextBudget } from '../domain/ContextBudget';
import type { AnalysisWarning, ProjectRegistryPort, FileContentPort } from './ports';

export type ContextOutputFormat = 'markdown' | 'xml' | 'json';

export type DesktopContextFile = Readonly<{
  relativePath: string;
  content: string;
}>;

export type ContextFormatterPort = Readonly<{
  format(input: Readonly<{ format: ContextOutputFormat; files: readonly DesktopContextFile[] }>): string;
}>;

export type BuildDesktopContextInput = Readonly<{
  candidates: readonly CandidateFile[];
  format: ContextOutputFormat;
  maxFileSizeKB: number;
  packMode?: PackMode;
  tokenLimit?: number;
  includeDependencies?: boolean;
  autoOptimize?: boolean;
  query?: string;
  presetKind?: string;
}>;

export type ContextManifestEntry = Readonly<{
  projectId: ProjectId;
  relativePath: string;
  included: boolean;
  reasons: readonly string[];
}>;

export type BuildDesktopContextResult = Readonly<{
  preview: string;
  warnings: readonly AnalysisWarning[];
  budget?: ContextBudget;
  manifest?: readonly ContextManifestEntry[];
}>;

export type BuildDesktopContextPorts = Readonly<{
  projects: ProjectRegistryPort;
  fileContent: FileContentPort;
  formatter: ContextFormatterPort;
}>;

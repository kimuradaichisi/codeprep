import type { Project } from '../domain/Project';
import type { RepositoryIndex } from '../domain/RepositoryIndex';

export type ScannedProjectFile = Readonly<{
  relativePath: string;
  size: number;
  mtimeMs?: number;
}>;

export interface RepositoryIndexStore {
  load(workspaceId: string): Promise<RepositoryIndex | undefined>;
  save(index: RepositoryIndex): Promise<void>;
  remove(workspaceId: string): Promise<void>;
}

export interface RepositoryFingerprintPort {
  computeHash(projectId: string, relativePath: string): Promise<string>;
}

export interface RepositoryScannerPort {
  scanProjectFiles(project: Project): Promise<readonly ScannedProjectFile[]>;
}

export interface ClockPort {
  nowIso(): string;
}

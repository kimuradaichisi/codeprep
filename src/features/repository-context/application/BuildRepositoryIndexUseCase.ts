import type { Project } from '../domain/Project';
import { classifyFileKind } from '../domain/FileKindClassifier';
import {
  CURRENT_INDEX_SCHEMA_VERSION,
  sortIndexEntries,
  type RepositoryIndex,
  type RepositoryIndexEntry,
} from '../domain/RepositoryIndex';
import {
  toIndexMetrics,
  type RepositoryIndexChangeSet,
  type RepositoryIndexMetrics,
} from '../domain/RepositoryIndexChangeSet';
import type {
  ClockPort,
  RepositoryFingerprintPort,
  RepositoryIndexStore,
  RepositoryScannerPort,
  ScannedProjectFile,
} from './repositoryIndexPorts';

export type BuildIndexInput = Readonly<{
  workspaceId: string;
  projects: readonly Project[];
}>;

export type BuildIndexResult = Readonly<{
  index: RepositoryIndex;
  changeSet: RepositoryIndexChangeSet;
  metrics: RepositoryIndexMetrics;
}>;

export type BuildIndexPorts = Readonly<{
  store: RepositoryIndexStore;
  scanner: RepositoryScannerPort;
  fingerprint: RepositoryFingerprintPort;
  clock: ClockPort;
}>;

export class BuildRepositoryIndexUseCase {
  public constructor(private readonly ports: BuildIndexPorts) {}

  public async execute(input: BuildIndexInput): Promise<BuildIndexResult> {
    const start = Date.now();
    const entries = await this.buildEntriesForProjects(input.projects);
    const sorted = sortIndexEntries(entries);
    const index = this.createIndex(input.workspaceId, sorted);
    await this.ports.store.save(index);
    const changeSet: RepositoryIndexChangeSet = { added: sorted, modified: [], deleted: [], unchangedCount: 0 };
    const metrics = toIndexMetrics(changeSet, sorted.length, sorted.length, Date.now() - start);
    return { index, changeSet, metrics };
  }

  private async buildEntriesForProjects(projects: readonly Project[]): Promise<RepositoryIndexEntry[]> {
    const list: RepositoryIndexEntry[] = [];
    for (const project of projects) {
      const scanned = await this.ports.scanner.scanProjectFiles(project);
      for (const file of scanned) {
        list.push(await this.buildSingleEntry(project.id, file));
      }
    }
    return list;
  }

  private async buildSingleEntry(projectId: string, file: ScannedProjectFile): Promise<RepositoryIndexEntry> {
    const hash = await this.ports.fingerprint.computeHash(projectId, file.relativePath);
    return {
      projectId,
      relativePath: file.relativePath,
      kind: classifyFileKind(file.relativePath),
      size: file.size,
      contentHash: hash,
      mtimeMs: file.mtimeMs,
      extension: file.relativePath.split('.').pop(),
    };
  }

  private createIndex(workspaceId: string, entries: readonly RepositoryIndexEntry[]): RepositoryIndex {
    const now = this.ports.clock.nowIso();
    return {
      metadata: { workspaceId, schemaVersion: CURRENT_INDEX_SCHEMA_VERSION, createdAt: now, updatedAt: now },
      entries,
    };
  }
}

import type { Project } from '../domain/Project';
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
import { BuildRepositoryIndexUseCase, type BuildIndexPorts } from './BuildRepositoryIndexUseCase';
import { IndexEntryComparator } from './IndexEntryComparator';
import type { ScannedProjectFile } from './repositoryIndexPorts';

export type RefreshIndexInput = Readonly<{
  workspaceId: string;
  projects: readonly Project[];
}>;

export type RefreshIndexResult = Readonly<{
  index: RepositoryIndex;
  changeSet: RepositoryIndexChangeSet;
  metrics: RepositoryIndexMetrics;
  rebuilt: boolean;
}>;

export class RefreshRepositoryIndexUseCase {
  private readonly comparator: IndexEntryComparator;
  private readonly buildUseCase: BuildRepositoryIndexUseCase;

  public constructor(private readonly ports: BuildIndexPorts) {
    this.comparator = new IndexEntryComparator(ports.fingerprint);
    this.buildUseCase = new BuildRepositoryIndexUseCase(ports);
  }

  public async execute(input: RefreshIndexInput): Promise<RefreshIndexResult> {
    const existing = await this.loadExisting(input.workspaceId);
    if (!existing) {
      const buildResult = await this.buildUseCase.execute(input);
      return { ...buildResult, rebuilt: true };
    }
    return this.refreshExisting(existing, input);
  }

  private async loadExisting(workspaceId: string): Promise<RepositoryIndex | undefined> {
    try {
      const index = await this.ports.store.load(workspaceId);
      if (!index || index.metadata.schemaVersion !== CURRENT_INDEX_SCHEMA_VERSION) {
        return undefined;
      }
      return index;
    } catch {
      return undefined;
    }
  }

  private async refreshExisting(existing: RepositoryIndex, input: RefreshIndexInput): Promise<RefreshIndexResult> {
    const start = Date.now();
    const scanned = await this.scanAllProjects(input.projects);
    const diff = await this.comparator.compare(existing.entries, scanned);
    const mergedEntries = sortIndexEntries([...diff.unchanged, ...diff.modified, ...diff.added]);
    const updatedIndex = this.buildUpdatedIndex(existing, mergedEntries);
    await this.ports.store.save(updatedIndex);
    const changeSet: RepositoryIndexChangeSet = {
      added: diff.added, modified: diff.modified, deleted: diff.deleted, unchangedCount: diff.unchanged.length,
    };
    const metrics = toIndexMetrics(changeSet, mergedEntries.length, diff.hashedCount, Date.now() - start);
    return { index: updatedIndex, changeSet, metrics, rebuilt: false };
  }

  private async scanAllProjects(projects: readonly Project[]): Promise<Readonly<{ projectId: string; file: ScannedProjectFile }>[]> {
    const list: { projectId: string; file: ScannedProjectFile }[] = [];
    for (const project of projects) {
      const scanned = await this.ports.scanner.scanProjectFiles(project);
      for (const file of scanned) {
        list.push({ projectId: project.id, file });
      }
    }
    return list;
  }

  private buildUpdatedIndex(existing: RepositoryIndex, entries: readonly RepositoryIndexEntry[]): RepositoryIndex {
    return {
      metadata: { ...existing.metadata, updatedAt: this.ports.clock.nowIso() },
      entries,
    };
  }
}

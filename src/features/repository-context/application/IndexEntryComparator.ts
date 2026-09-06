import { classifyFileKind } from '../domain/FileKindClassifier';
import type { RepositoryIndexEntry } from '../domain/RepositoryIndex';
import type { RepositoryFingerprintPort, ScannedProjectFile } from './repositoryIndexPorts';

export type EntryComparisonResult = Readonly<{
  added: readonly RepositoryIndexEntry[];
  modified: readonly RepositoryIndexEntry[];
  deleted: readonly RepositoryIndexEntry[];
  unchanged: readonly RepositoryIndexEntry[];
  hashedCount: number;
}>;

export const entryKey = (projectId: string, relativePath: string): string =>
  `${projectId}:${relativePath}`;

export class IndexEntryComparator {
  public constructor(private readonly fingerprint: RepositoryFingerprintPort) {}

  public async compare(
    existingEntries: readonly RepositoryIndexEntry[],
    scannedFiles: readonly Readonly<{ projectId: string; file: ScannedProjectFile }>[]
  ): Promise<EntryComparisonResult> {
    const existingMap = new Map(existingEntries.map(e => [entryKey(e.projectId, e.relativePath), e]));
    const scannedKeys = new Set<string>();
    const diff = { added: [] as RepositoryIndexEntry[], modified: [] as RepositoryIndexEntry[], unchanged: [] as RepositoryIndexEntry[], hashedCount: 0 };
    for (const item of scannedFiles) {
      scannedKeys.add(entryKey(item.projectId, item.file.relativePath));
      await this.processItem(item, existingMap, diff);
    }
    const deleted = existingEntries.filter(e => !scannedKeys.has(entryKey(e.projectId, e.relativePath)));
    return { ...diff, deleted };
  }

  private async processItem(
    item: Readonly<{ projectId: string; file: ScannedProjectFile }>,
    existingMap: Map<string, RepositoryIndexEntry>,
    diff: { added: RepositoryIndexEntry[]; modified: RepositoryIndexEntry[]; unchanged: RepositoryIndexEntry[]; hashedCount: number }
  ): Promise<void> {
    const existing = existingMap.get(entryKey(item.projectId, item.file.relativePath));
    if (!existing) {
      diff.added.push(await this.createEntry(item.projectId, item.file));
      diff.hashedCount++;
      return;
    }
    const check = await this.checkExisting(existing, item);
    if (check.isModified) diff.modified.push(check.entry);
    else diff.unchanged.push(check.entry);
    if (check.wasHashed) diff.hashedCount++;
  }

  private async checkExisting(
    existing: RepositoryIndexEntry,
    scanned: Readonly<{ projectId: string; file: ScannedProjectFile }>
  ): Promise<{ entry: RepositoryIndexEntry; isModified: boolean; wasHashed: boolean }> {
    if (this.isReliablyUnchanged(existing, scanned.file)) {
      return { entry: existing, isModified: false, wasHashed: false };
    }
    const newEntry = await this.createEntry(scanned.projectId, scanned.file);
    const isModified = newEntry.contentHash !== existing.contentHash;
    return { entry: isModified ? newEntry : existing, isModified, wasHashed: true };
  }

  private isReliablyUnchanged(existing: RepositoryIndexEntry, file: ScannedProjectFile): boolean {
    if (existing.size !== file.size) return false;
    if (existing.mtimeMs === undefined || file.mtimeMs === undefined) return false;
    return existing.mtimeMs === file.mtimeMs;
  }

  private async createEntry(projectId: string, file: ScannedProjectFile): Promise<RepositoryIndexEntry> {
    const hash = await this.fingerprint.computeHash(projectId, file.relativePath);
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
}

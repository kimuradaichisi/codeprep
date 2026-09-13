export interface RepositoryFileRename {
  readonly oldPath: string;
  readonly newPath: string;
}

export interface RepositoryChangeSet {
  readonly fromRevision: string;
  readonly toRevision: string;
  readonly added: readonly string[];
  readonly modified: readonly string[];
  readonly deleted: readonly string[];
  readonly renamed: readonly RepositoryFileRename[];
  readonly allChangedPaths: readonly string[];
}

export interface RepositoryRevisionPort {
  currentRevision(workspaceRoot: string): Promise<string | null>;
  diff(workspaceRoot: string, fromRevision: string, toRevision: string): Promise<RepositoryChangeSet>;
  isWorkingTreeClean(workspaceRoot: string): Promise<boolean>;
}

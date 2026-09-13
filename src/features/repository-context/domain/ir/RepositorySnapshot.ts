export interface RepositorySnapshot {
  readonly snapshotId: string;
  readonly repositoryId: string;
  readonly revision?: string;
  readonly workspaceRoot: string;
  readonly createdAt: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export function isValidSnapshot(snapshot: RepositorySnapshot): boolean {
  if (!snapshot.snapshotId || snapshot.snapshotId.trim().length === 0) return false;
  if (!snapshot.repositoryId || snapshot.repositoryId.trim().length === 0) return false;
  if (!snapshot.workspaceRoot || snapshot.workspaceRoot.trim().length === 0) return false;
  if (!snapshot.createdAt || snapshot.createdAt.trim().length === 0) return false;
  return true;
}

export function createRepositorySnapshot(params: RepositorySnapshot): RepositorySnapshot {
  if (!isValidSnapshot(params)) {
    throw new Error(`Invalid RepositorySnapshot: ${JSON.stringify(params)}`);
  }
  return Object.freeze({
    ...params,
    metadata: params.metadata ? Object.freeze({ ...params.metadata }) : undefined,
  });
}

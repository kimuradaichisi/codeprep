/**
 * リポジトリ内ファイルの軽量種別分類
 */
export type RepositoryFileKind =
  | 'code'
  | 'document'
  | 'config'
  | 'test'
  | 'other';

/**
 * リポジトリインデックスのエントリ
 * Identity: projectId + relativePath
 */
export type RepositoryIndexEntry = Readonly<{
  projectId: string;
  relativePath: string;
  kind: RepositoryFileKind;
  size: number;
  contentHash: string;
  mtimeMs?: number;
  extension?: string;
}>;

/**
 * インデックスメタデータ (schemaVersion 1)
 */
export type RepositoryIndexMetadata = Readonly<{
  workspaceId: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
}>;

/**
 * リポジトリインデックス集約
 */
export type RepositoryIndex = Readonly<{
  metadata: RepositoryIndexMetadata;
  entries: readonly RepositoryIndexEntry[];
}>;

export const CURRENT_INDEX_SCHEMA_VERSION = 1;

/**
 * エントリを projectId ASC, relativePath ASC で決定論的ソート
 */
export function sortIndexEntries(
  entries: readonly RepositoryIndexEntry[]
): readonly RepositoryIndexEntry[] {
  return [...entries].sort((a, b) => {
    if (a.projectId !== b.projectId) {
      return a.projectId.localeCompare(b.projectId);
    }
    return a.relativePath.localeCompare(b.relativePath);
  });
}

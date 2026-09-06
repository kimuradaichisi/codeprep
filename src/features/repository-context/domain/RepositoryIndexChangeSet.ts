import type { RepositoryIndexEntry } from './RepositoryIndex';

/**
 * インデックス増分更新の差分結果
 * Phase 3B (Markdown / Code Symbol Index) に引き渡すContract
 */
export type RepositoryIndexChangeSet = Readonly<{
  added: readonly RepositoryIndexEntry[];
  modified: readonly RepositoryIndexEntry[];
  deleted: readonly RepositoryIndexEntry[];
  unchangedCount: number;
}>;

/**
 * インデックス構築・更新メトリクス
 */
export type RepositoryIndexMetrics = Readonly<{
  totalFiles: number;
  added: number;
  modified: number;
  deleted: number;
  unchanged: number;
  hashedFiles: number;
  durationMs?: number;
}>;

/**
 * 空の変更セットを生成
 */
export function createEmptyChangeSet(): RepositoryIndexChangeSet {
  return {
    added: [],
    modified: [],
    deleted: [],
    unchangedCount: 0,
  };
}

/**
 * ChangeSet から Metrics を集計
 */
export function toIndexMetrics(
  changeSet: RepositoryIndexChangeSet,
  totalFiles: number,
  hashedFiles: number,
  durationMs?: number
): RepositoryIndexMetrics {
  return {
    totalFiles,
    added: changeSet.added.length,
    modified: changeSet.modified.length,
    deleted: changeSet.deleted.length,
    unchanged: changeSet.unchangedCount,
    hashedFiles,
    durationMs,
  };
}

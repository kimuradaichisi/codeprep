import type {
  RepositoryEdge,
  RepositoryEvidence,
  RepositoryIR,
  RepositoryNode,
  RepositorySnapshot,
} from '../../../domain/ir';
import { createRepositoryIR } from '../../../domain/ir';
import type { StoreStatistics } from '../../../application/ir/persistence/PersistenceDto';
import type { SqliteDriver } from './SqliteDriver';
import type { EdgeRow, EvidenceRow, NodeRow, SnapshotRow } from './RepositoryIRRowMapper';
import { mapEdgeRow, mapEvidenceRow, mapNodeRow, mapSnapshotRow } from './RepositoryIRRowMapper';

function loadSnapshot(driver: SqliteDriver, snapshotId: string): RepositorySnapshot | null {
  const row = driver.prepare('SELECT * FROM repository_snapshots WHERE snapshot_id = ?;').get(snapshotId) as SnapshotRow | undefined;
  return row ? mapSnapshotRow(row) : null;
}

function loadNodes(driver: SqliteDriver, snapshotId: string): readonly RepositoryNode[] {
  const rows = driver.prepare('SELECT * FROM repository_nodes WHERE snapshot_id = ?;').all(snapshotId) as NodeRow[];
  return Object.freeze(rows.map(mapNodeRow));
}

function loadEvidenceMap(driver: SqliteDriver, snapshotId: string): Map<string, RepositoryEvidence[]> {
  const rows = driver.prepare('SELECT * FROM repository_evidence WHERE snapshot_id = ?;').all(snapshotId) as EvidenceRow[];
  const map = new Map<string, RepositoryEvidence[]>();
  for (const row of rows) {
    const ev = mapEvidenceRow(row);
    const list = map.get(row.edge_id) ?? [];
    list.push(ev);
    map.set(row.edge_id, list);
  }
  return map;
}

function loadEdges(driver: SqliteDriver, snapshotId: string): readonly RepositoryEdge[] {
  const evMap = loadEvidenceMap(driver, snapshotId);
  const rows = driver.prepare('SELECT * FROM repository_edges WHERE snapshot_id = ?;').all(snapshotId) as EdgeRow[];
  return Object.freeze(rows.map(r => mapEdgeRow(r, evMap.get(r.edge_id) ?? [])));
}

function countRows(driver: SqliteDriver, table: string, snapshotId?: string): number {
  const sql = snapshotId ? `SELECT COUNT(*) as c FROM ${table} WHERE snapshot_id = ?;` : `SELECT COUNT(*) as c FROM ${table};`;
  const row = (snapshotId ? driver.prepare(sql).get(snapshotId) : driver.prepare(sql).get()) as { c: number } | undefined;
  return row?.c ?? 0;
}

export class SqliteRepositoryIRReader {
  constructor(private readonly driver: SqliteDriver) {}

  public load(snapshotId: string): RepositoryIR | null {
    const snapshot = loadSnapshot(this.driver, snapshotId);
    if (!snapshot) return null;
    const nodes = loadNodes(this.driver, snapshotId);
    const edges = loadEdges(this.driver, snapshotId);
    return createRepositoryIR({ snapshot, nodes, edges });
  }

  public findLatest(repositoryId: string): RepositorySnapshot | null {
    const row = this.driver.prepare(
      'SELECT * FROM repository_snapshots WHERE repository_id = ? ORDER BY created_at DESC LIMIT 1;'
    ).get(repositoryId) as SnapshotRow | undefined;
    return row ? mapSnapshotRow(row) : null;
  }

  public findByRevision(repositoryId: string, revision: string): RepositorySnapshot | null {
    const row = this.driver.prepare(
      'SELECT * FROM repository_snapshots WHERE repository_id = ? AND commit_sha = ? ORDER BY created_at DESC LIMIT 1;'
    ).get(repositoryId, revision) as SnapshotRow | undefined;
    return row ? mapSnapshotRow(row) : null;
  }

  public getStatistics(snapshotId?: string): StoreStatistics {
    return {
      snapshotCount: countRows(this.driver, 'repository_snapshots'),
      nodeCount: countRows(this.driver, 'repository_nodes', snapshotId),
      edgeCount: countRows(this.driver, 'repository_edges', snapshotId),
      evidenceCount: countRows(this.driver, 'repository_evidence', snapshotId),
      dbSizeBytes: 0,
    };
  }
}

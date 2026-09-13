import type { RepositoryEdge, RepositoryNode } from '../../../domain/ir';
import type { NeighborQueryFilter, NeighborQueryResult } from '../../../application/ir/persistence/PersistenceDto';
import type { SqliteDriver } from './SqliteDriver';
import type { EdgeRow, EvidenceRow, NodeRow } from './RepositoryIRRowMapper';
import { mapEdgeRow, mapEvidenceRow, mapNodeRow } from './RepositoryIRRowMapper';

function buildQueryConditions(filter: NeighborQueryFilter): { sql: string; params: unknown[] } {
  const dir = filter.direction ?? 'both';
  const conditions: string[] = ['snapshot_id = ?'];
  const params: unknown[] = [filter.snapshotId];

  if (dir === 'outgoing') {
    conditions.push('source_node_id = ?');
    params.push(filter.nodeId);
  } else if (dir === 'incoming') {
    conditions.push('target_node_id = ?');
    params.push(filter.nodeId);
  } else {
    conditions.push('(source_node_id = ? OR target_node_id = ?)');
    params.push(filter.nodeId, filter.nodeId);
  }

  if (filter.relationTypes && filter.relationTypes.length > 0) {
    const placeholders = filter.relationTypes.map(() => '?').join(', ');
    conditions.push(`relation_type IN (${placeholders})`);
    params.push(...filter.relationTypes);
  }

  return { sql: `SELECT * FROM repository_edges WHERE ${conditions.join(' AND ')};`, params };
}

function loadEvidencesForEdges(driver: SqliteDriver, snapshotId: string, edgeIds: readonly string[]): Map<string, EvidenceRow[]> {
  if (edgeIds.length === 0) return new Map();
  const placeholders = edgeIds.map(() => '?').join(', ');
  const rows = driver.prepare(
    `SELECT * FROM repository_evidence WHERE snapshot_id = ? AND edge_id IN (${placeholders});`
  ).all(snapshotId, ...edgeIds) as EvidenceRow[];

  const map = new Map<string, EvidenceRow[]>();
  for (const r of rows) {
    const list = map.get(r.edge_id) ?? [];
    list.push(r);
    map.set(r.edge_id, list);
  }
  return map;
}

function loadNodesByIds(driver: SqliteDriver, snapshotId: string, nodeIds: Set<string>): readonly RepositoryNode[] {
  if (nodeIds.size === 0) return [];
  const ids = Array.from(nodeIds);
  const placeholders = ids.map(() => '?').join(', ');
  const rows = driver.prepare(
    `SELECT * FROM repository_nodes WHERE snapshot_id = ? AND node_id IN (${placeholders});`
  ).all(snapshotId, ...ids) as NodeRow[];
  return Object.freeze(rows.map(mapNodeRow));
}

export class SqliteNeighborQuery {
  constructor(private readonly driver: SqliteDriver) {}

  public execute(filter: NeighborQueryFilter): NeighborQueryResult {
    const { sql, params } = buildQueryConditions(filter);
    const edgeRows = this.driver.prepare(sql).all(...params) as EdgeRow[];
    const edgeIds = edgeRows.map(r => r.edge_id);
    const evMap = loadEvidencesForEdges(this.driver, filter.snapshotId, edgeIds);

    const edges: RepositoryEdge[] = edgeRows.map(r => {
      const rawEvs = evMap.get(r.edge_id) ?? [];
      return mapEdgeRow(r, rawEvs.map(mapEvidenceRow));
    });

    const targetNodeIds = new Set<string>();
    for (const e of edges) {
      if (e.sourceNodeId !== filter.nodeId) targetNodeIds.add(e.sourceNodeId);
      if (e.targetNodeId !== filter.nodeId) targetNodeIds.add(e.targetNodeId);
    }

    const targetNodes = loadNodesByIds(this.driver, filter.snapshotId, targetNodeIds);
    return Object.freeze({ edges: Object.freeze(edges), targetNodes });
  }
}

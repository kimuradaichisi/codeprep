import type {
  RepositoryEdge,
  RepositoryEvidence,
  RepositoryIR,
  RepositoryNode,
  RepositorySnapshot,
} from '../../../domain/ir';
import type { SqliteDriver, SqliteStatement } from './SqliteDriver';
import { SCHEMA_VERSION, ANALYSIS_VERSION } from '../../../application/ir/persistence/PersistenceDto';

function saveSnapshot(driver: SqliteDriver, snapshot: RepositorySnapshot): void {
  const stmt = driver.prepare(`
    INSERT OR REPLACE INTO repository_snapshots
    (snapshot_id, repository_id, commit_sha, workspace_root, created_at, schema_version, analysis_version, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
  `);
  stmt.run(
    snapshot.snapshotId,
    snapshot.repositoryId,
    snapshot.revision ?? null,
    snapshot.workspaceRoot,
    snapshot.createdAt,
    SCHEMA_VERSION,
    ANALYSIS_VERSION,
    snapshot.metadata ? JSON.stringify(snapshot.metadata) : null
  );
}

function saveNodes(driver: SqliteDriver, snapshotId: string, nodes: Iterable<RepositoryNode>): void {
  const stmt = driver.prepare(`
    INSERT OR REPLACE INTO repository_nodes
    (snapshot_id, node_id, kind, name, relative_path, start_line, end_line, start_column, end_column, language, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);
  for (const node of nodes) {
    stmt.run(
      snapshotId,
      node.id,
      node.kind,
      node.name,
      node.path,
      node.location?.startLine ?? null,
      node.location?.endLine ?? null,
      node.location?.startColumn ?? null,
      node.location?.endColumn ?? null,
      node.language ?? null,
      node.metadata ? JSON.stringify(node.metadata) : null
    );
  }
}

function saveEvidenceList(
  evStmt: SqliteStatement,
  snapshotId: string,
  edgeId: string,
  evidences: readonly RepositoryEvidence[]
): void {
  for (const ev of evidences) {
    evStmt.run(
      ev.id,
      snapshotId,
      edgeId,
      ev.category,
      ev.analyzer,
      ev.confidence,
      ev.sourcePath ?? null,
      ev.sourceLocation?.startLine ?? null,
      ev.sourceLocation?.endLine ?? null,
      ev.sourceLocation?.startColumn ?? null,
      ev.sourceLocation?.endColumn ?? null,
      ev.details ? JSON.stringify(ev.details) : null,
      ev.createdAt ?? null
    );
  }
}

function saveEdges(driver: SqliteDriver, snapshotId: string, edges: readonly RepositoryEdge[]): void {
  const edgeStmt = driver.prepare(`
    INSERT OR REPLACE INTO repository_edges
    (snapshot_id, edge_id, source_node_id, target_node_id, relation_type, is_derived, confidence, rule_name, description, derived_from_json, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);
  const evStmt = driver.prepare(`
    INSERT OR REPLACE INTO repository_evidence
    (evidence_id, snapshot_id, edge_id, category, analyzer, confidence, source_path, start_line, end_line, start_column, end_column, details_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);

  for (const edge of edges) {
    edgeStmt.run(
      snapshotId,
      edge.id,
      edge.sourceNodeId,
      edge.targetNodeId,
      edge.relationType,
      edge.isDerived ? 1 : 0,
      edge.confidence,
      null,
      null,
      null,
      edge.metadata ? JSON.stringify(edge.metadata) : null
    );
    saveEvidenceList(evStmt, snapshotId, edge.id, edge.evidences);
  }
}

export class SqliteRepositoryIRWriter {
  constructor(private readonly driver: SqliteDriver) {}

  public save(ir: RepositoryIR): void {
    this.driver.transaction(() => {
      saveSnapshot(this.driver, ir.snapshot);
      saveNodes(this.driver, ir.snapshot.snapshotId, ir.nodes.values());
      saveEdges(this.driver, ir.snapshot.snapshotId, ir.edges);
    });
  }

  public deleteSnapshot(snapshotId: string): void {
    this.driver.transaction(() => {
      this.driver.prepare('DELETE FROM repository_evidence WHERE snapshot_id = ?;').run(snapshotId);
      this.driver.prepare('DELETE FROM repository_edges WHERE snapshot_id = ?;').run(snapshotId);
      this.driver.prepare('DELETE FROM repository_nodes WHERE snapshot_id = ?;').run(snapshotId);
      this.driver.prepare('DELETE FROM repository_snapshots WHERE snapshot_id = ?;').run(snapshotId);
    });
  }
}

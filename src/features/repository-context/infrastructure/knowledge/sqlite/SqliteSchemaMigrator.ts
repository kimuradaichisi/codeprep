import type { SqliteDriver } from './SqliteDriver';
import { SCHEMA_VERSION, ANALYSIS_VERSION } from '../../../application/ir/persistence/PersistenceDto';

const SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS repository_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  repository_id TEXT NOT NULL,
  commit_sha TEXT,
  workspace_root TEXT NOT NULL,
  created_at TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  analysis_version TEXT NOT NULL,
  metadata_json TEXT
);

CREATE TABLE IF NOT EXISTS repository_nodes (
  snapshot_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  start_line INTEGER,
  end_line INTEGER,
  start_column INTEGER,
  end_column INTEGER,
  language TEXT,
  metadata_json TEXT,
  PRIMARY KEY (snapshot_id, node_id)
);

CREATE TABLE IF NOT EXISTS repository_edges (
  snapshot_id TEXT NOT NULL,
  edge_id TEXT NOT NULL,
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  is_derived INTEGER NOT NULL,
  confidence REAL NOT NULL,
  rule_name TEXT,
  description TEXT,
  derived_from_json TEXT,
  metadata_json TEXT,
  PRIMARY KEY (snapshot_id, edge_id)
);

CREATE TABLE IF NOT EXISTS repository_evidence (
  evidence_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  edge_id TEXT NOT NULL,
  category TEXT NOT NULL,
  analyzer TEXT NOT NULL,
  confidence REAL NOT NULL,
  source_path TEXT,
  start_line INTEGER,
  end_line INTEGER,
  start_column INTEGER,
  end_column INTEGER,
  details_json TEXT,
  created_at TEXT,
  PRIMARY KEY (snapshot_id, edge_id, evidence_id)
);

CREATE TABLE IF NOT EXISTS store_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_nodes_path ON repository_nodes(snapshot_id, relative_path);
CREATE INDEX IF NOT EXISTS idx_nodes_kind ON repository_nodes(snapshot_id, kind);
CREATE INDEX IF NOT EXISTS idx_nodes_name ON repository_nodes(snapshot_id, name);
CREATE INDEX IF NOT EXISTS idx_edges_src ON repository_edges(snapshot_id, source_node_id, relation_type);
CREATE INDEX IF NOT EXISTS idx_edges_tgt ON repository_edges(snapshot_id, target_node_id, relation_type);
CREATE INDEX IF NOT EXISTS idx_edges_rel ON repository_edges(snapshot_id, relation_type);
CREATE INDEX IF NOT EXISTS idx_evidence_edge ON repository_evidence(snapshot_id, edge_id);
CREATE INDEX IF NOT EXISTS idx_evidence_path ON repository_evidence(snapshot_id, source_path);
`;

export function migrateSchema(driver: SqliteDriver): void {
  driver.exec(SCHEMA_DDL);
  const upsertMetadata = driver.prepare(
    'INSERT INTO store_metadata (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;'
  );
  upsertMetadata.run('schema_version', SCHEMA_VERSION);
  upsertMetadata.run('analysis_version', ANALYSIS_VERSION);
  upsertMetadata.run('last_migrated', new Date().toISOString());
}

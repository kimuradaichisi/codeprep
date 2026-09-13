import type {
  EvidenceProvenanceCategory,
  RepositoryEdge,
  RepositoryEvidence,
  RepositoryNode,
  RepositoryNodeKind,
  RepositoryRelationType,
  RepositorySnapshot,
} from '../../../domain/ir';
import {
  createEvidence,
  createRepositoryEdge,
  createRepositoryNode,
  createRepositorySnapshot,
} from '../../../domain/ir';

export interface SnapshotRow {
  snapshot_id: string;
  repository_id: string;
  commit_sha: string | null;
  workspace_root: string;
  created_at: string;
  schema_version: string;
  analysis_version: string;
  metadata_json: string | null;
}

export interface NodeRow {
  snapshot_id: string;
  node_id: string;
  kind: string;
  name: string;
  relative_path: string;
  start_line: number | null;
  end_line: number | null;
  start_column: number | null;
  end_column: number | null;
  language: string | null;
  metadata_json: string | null;
}

export interface EdgeRow {
  snapshot_id: string;
  edge_id: string;
  source_node_id: string;
  target_node_id: string;
  relation_type: string;
  is_derived: number;
  confidence: number;
  rule_name: string | null;
  description: string | null;
  derived_from_json: string | null;
  metadata_json: string | null;
}

export interface EvidenceRow {
  evidence_id: string;
  snapshot_id: string;
  edge_id: string;
  category: string;
  analyzer: string;
  confidence: number;
  source_path: string | null;
  start_line: number | null;
  end_line: number | null;
  start_column: number | null;
  end_column: number | null;
  details_json: string | null;
  created_at: string | null;
}

export function mapSnapshotRow(row: SnapshotRow): RepositorySnapshot {
  return createRepositorySnapshot({
    snapshotId: row.snapshot_id,
    repositoryId: row.repository_id,
    revision: row.commit_sha ?? undefined,
    workspaceRoot: row.workspace_root,
    createdAt: row.created_at,
    metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined,
  });
}

export function mapNodeRow(row: NodeRow): RepositoryNode {
  const location = row.start_line && row.end_line
    ? {
        startLine: row.start_line,
        endLine: row.end_line,
        startColumn: row.start_column ?? undefined,
        endColumn: row.end_column ?? undefined,
      }
    : undefined;

  return createRepositoryNode({
    id: row.node_id,
    snapshotId: row.snapshot_id,
    kind: row.kind as RepositoryNodeKind,
    name: row.name,
    path: row.relative_path,
    location,
    language: row.language ?? undefined,
    metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined,
  });
}

export function mapEvidenceRow(row: EvidenceRow): RepositoryEvidence {
  const sourceLocation = row.start_line && row.end_line
    ? {
        startLine: row.start_line,
        endLine: row.end_line,
        startColumn: row.start_column ?? undefined,
        endColumn: row.end_column ?? undefined,
      }
    : undefined;

  return createEvidence({
    id: row.evidence_id,
    category: row.category as EvidenceProvenanceCategory,
    analyzer: row.analyzer,
    confidence: row.confidence,
    sourcePath: row.source_path ?? undefined,
    sourceLocation,
    details: row.details_json ? JSON.parse(row.details_json) : undefined,
    createdAt: row.created_at ?? undefined,
  });
}

export function mapEdgeRow(row: EdgeRow, evidences: readonly RepositoryEvidence[]): RepositoryEdge {
  return createRepositoryEdge({
    id: row.edge_id,
    snapshotId: row.snapshot_id,
    sourceNodeId: row.source_node_id,
    targetNodeId: row.target_node_id,
    relationType: row.relation_type as RepositoryRelationType,
    isDerived: row.is_derived === 1,
    confidence: row.confidence,
    evidences,
    metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined,
  });
}

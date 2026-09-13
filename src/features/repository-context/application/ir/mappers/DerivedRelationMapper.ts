import type { RepositoryEdge, RepositorySnapshot } from '../../../domain/ir';
import {
  buildEdgeId,
  createEvidence,
  createRepositoryEdge,
} from '../../../domain/ir';

export interface GitCoChangeRelation {
  readonly fromPath: string;
  readonly toPath: string;
  readonly count: number;
}

export interface DocGraphRelationPair {
  readonly fromPath: string;
  readonly toPath: string;
  readonly reason: string;
  readonly confidence: number;
}

function createGitEvidence(src: string, tgt: string, count: number, conf: number) {
  return createEvidence({
    id: `ev:git:${src}->${tgt}`, category: 'git-history', analyzer: 'git-cochange',
    confidence: conf, details: { sharedCommitCount: count },
  });
}

function mapSingleGitCoChange(
  rel: GitCoChangeRelation, snapshot: RepositorySnapshot, fileNodeIdByPath: ReadonlyMap<string, string>
): RepositoryEdge | undefined {
  const src = fileNodeIdByPath.get(rel.fromPath.replace(/\\/g, '/'));
  const tgt = fileNodeIdByPath.get(rel.toPath.replace(/\\/g, '/'));
  if (!src || !tgt || src === tgt) return undefined;
  const conf = Math.min(Math.max(rel.count / 10, 0.1), 1.0);
  const id = buildEdgeId(snapshot.snapshotId, src, 'co-changed-with', tgt);
  return createRepositoryEdge({
    id, snapshotId: snapshot.snapshotId, sourceNodeId: src, targetNodeId: tgt,
    relationType: 'co-changed-with', isDerived: true, confidence: conf,
    evidences: [createGitEvidence(src, tgt, rel.count, conf)],
  });
}

function createDocGraphEvidence(src: string, tgt: string, reason: string, conf: number) {
  return createEvidence({
    id: `ev:docgraph:${src}->${tgt}`, category: 'rule-derived', analyzer: 'docgraph',
    confidence: conf, details: { reason },
  });
}

function mapSingleDocGraphRelation(
  rel: DocGraphRelationPair, snapshot: RepositorySnapshot, fileNodeIdByPath: ReadonlyMap<string, string>
): RepositoryEdge | undefined {
  const src = fileNodeIdByPath.get(rel.fromPath.replace(/\\/g, '/'));
  const tgt = fileNodeIdByPath.get(rel.toPath.replace(/\\/g, '/'));
  if (!src || !tgt || src === tgt) return undefined;
  const conf = Math.min(Math.max(rel.confidence, 0.0), 1.0);
  const id = buildEdgeId(snapshot.snapshotId, src, 'doc-relation', tgt);
  return createRepositoryEdge({
    id, snapshotId: snapshot.snapshotId, sourceNodeId: src, targetNodeId: tgt,
    relationType: 'doc-relation', isDerived: true, confidence: conf,
    evidences: [createDocGraphEvidence(src, tgt, rel.reason, conf)],
  });
}

export function mapGitCoChangesToEdges(
  relations: readonly GitCoChangeRelation[],
  snapshot: RepositorySnapshot,
  fileNodeIdByPath: ReadonlyMap<string, string>
): readonly RepositoryEdge[] {
  const edges: RepositoryEdge[] = [];
  for (const rel of relations) {
    const edge = mapSingleGitCoChange(rel, snapshot, fileNodeIdByPath);
    if (edge) edges.push(edge);
  }
  return Object.freeze(edges);
}

export function mapDocGraphRelationsToEdges(
  relations: readonly DocGraphRelationPair[],
  snapshot: RepositorySnapshot,
  fileNodeIdByPath: ReadonlyMap<string, string>
): readonly RepositoryEdge[] {
  const edges: RepositoryEdge[] = [];
  for (const rel of relations) {
    const edge = mapSingleDocGraphRelation(rel, snapshot, fileNodeIdByPath);
    if (edge) edges.push(edge);
  }
  return Object.freeze(edges);
}

import type { RepositoryEdge, RepositoryEvidence, RepositorySnapshot } from '../../../domain/ir';
import {
  buildEdgeId,
  createEvidence,
  createRepositoryEdge,
} from '../../../domain/ir';

export interface FileDependencyPair {
  readonly fromPath: string;
  readonly toPath: string;
}

function createDependencyEvidence(
  sourceNodeId: string,
  targetNodeId: string,
  normFrom: string,
  normTo: string
): RepositoryEvidence {
  return createEvidence({
    id: `ev:dep:${sourceNodeId}->${targetNodeId}`,
    category: 'regex-pattern',
    analyzer: 'dependency-scanner',
    confidence: 0.8,
    sourcePath: normFrom,
    details: { importPath: normTo },
  });
}

function mapSingleDependency(
  pair: FileDependencyPair, snapshot: RepositorySnapshot, fileNodeIdByPath: ReadonlyMap<string, string>
): RepositoryEdge | undefined {
  const normFrom = pair.fromPath.replace(/\\/g, '/');
  const normTo = pair.toPath.replace(/\\/g, '/');
  const src = fileNodeIdByPath.get(normFrom);
  const tgt = fileNodeIdByPath.get(normTo);
  if (!src || !tgt) return undefined;
  const ev = createDependencyEvidence(src, tgt, normFrom, normTo);
  const id = buildEdgeId(snapshot.snapshotId, src, 'depends-on', tgt);
  return createRepositoryEdge({
    id, snapshotId: snapshot.snapshotId, sourceNodeId: src, targetNodeId: tgt,
    relationType: 'depends-on', isDerived: false, confidence: 0.8, evidences: [ev],
  });
}

export function mapDependenciesToEdges(
  dependencies: readonly FileDependencyPair[],
  snapshot: RepositorySnapshot,
  fileNodeIdByPath: ReadonlyMap<string, string>
): readonly RepositoryEdge[] {
  const seenEdgeIds = new Set<string>();
  const edges: RepositoryEdge[] = [];
  for (const pair of dependencies) {
    const edge = mapSingleDependency(pair, snapshot, fileNodeIdByPath);
    if (!edge || seenEdgeIds.has(edge.id)) continue;
    seenEdgeIds.add(edge.id);
    edges.push(edge);
  }
  return Object.freeze(edges);
}

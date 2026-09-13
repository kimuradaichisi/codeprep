import type { RepositoryEdge } from './RepositoryEdge';
import type { RepositoryNode } from './RepositoryNode';
import type { RepositorySnapshot } from './RepositorySnapshot';
import {
  assertEdgeInvariants,
  assertNodeInvariants,
  assertSnapshotInvariants,
} from './RepositoryIRInvariants';

export interface RepositoryIR {
  readonly snapshot: RepositorySnapshot;
  readonly nodes: ReadonlyMap<string, RepositoryNode>;
  readonly edges: readonly RepositoryEdge[];
}

export interface CreateRepositoryIRParams {
  readonly snapshot: RepositorySnapshot;
  readonly nodes: readonly RepositoryNode[];
  readonly edges: readonly RepositoryEdge[];
}

function buildNodeMap(nodes: readonly RepositoryNode[]): Map<string, RepositoryNode> {
  const map = new Map<string, RepositoryNode>();
  for (const node of nodes) {
    assertNodeInvariants(node);
    if (map.has(node.id)) {
      throw new Error(`Duplicate RepositoryNode id: ${node.id}`);
    }
    map.set(node.id, node);
  }
  return map;
}

function validateEdges(
  edges: readonly RepositoryEdge[],
  nodeMap: Map<string, RepositoryNode>,
  snapshotId: string
): void {
  const edgeIdSet = new Set<string>();
  const nodeIdSet = new Set(nodeMap.keys());
  for (const edge of edges) {
    if (edgeIdSet.has(edge.id)) {
      throw new Error(`Duplicate RepositoryEdge id: ${edge.id}`);
    }
    edgeIdSet.add(edge.id);
    assertEdgeInvariants(edge, nodeIdSet, snapshotId);
  }
}

export function createRepositoryIR(params: CreateRepositoryIRParams): RepositoryIR {
  assertSnapshotInvariants(params.snapshot);
  const nodeMap = buildNodeMap(params.nodes);
  validateEdges(params.edges, nodeMap, params.snapshot.snapshotId);

  return Object.freeze({
    snapshot: params.snapshot,
    nodes: nodeMap,
    edges: Object.freeze([...params.edges]),
  });
}

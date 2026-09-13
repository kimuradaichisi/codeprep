import type { RepositoryEdge, RepositoryIR, RepositoryNode, RepositorySnapshot } from '../../../domain/ir';
import { buildEdgeId, createRepositoryEdge, createRepositoryIR, createRepositoryNode } from '../../../domain/ir';

export interface AssembleIRInput {
  readonly newSnapshot: RepositorySnapshot;
  readonly retainedNodes: readonly RepositoryNode[];
  readonly retainedEdges: readonly RepositoryEdge[];
  readonly addedNodes: readonly RepositoryNode[];
  readonly addedEdges: readonly RepositoryEdge[];
}

function rebindNode(node: RepositoryNode, newSnapshotId: string) {
  const oldId = node.id;
  const newId = oldId.startsWith(`node:${node.snapshotId}:`)
    ? oldId.replace(`node:${node.snapshotId}:`, `node:${newSnapshotId}:`)
    : `${node.kind}:${newSnapshotId}:${node.path}`;

  const remappedNode = createRepositoryNode({
    ...node,
    id: newId,
    snapshotId: newSnapshotId,
  });
  return { oldId, newId, remappedNode };
}

function rebindEdge(edge: RepositoryEdge, newSnapshotId: string, nodeIdMap: Map<string, string>): RepositoryEdge | undefined {
  const newSrc = nodeIdMap.get(edge.sourceNodeId);
  const newTgt = nodeIdMap.get(edge.targetNodeId);
  if (!newSrc || !newTgt) return undefined;

  const newId = buildEdgeId(newSnapshotId, newSrc, edge.relationType, newTgt);
  return createRepositoryEdge({
    ...edge,
    id: newId,
    snapshotId: newSnapshotId,
    sourceNodeId: newSrc,
    targetNodeId: newTgt,
  });
}

export function assembleRepositoryIR(input: AssembleIRInput): RepositoryIR {
  const newSnapshotId = input.newSnapshot.snapshotId;
  const nodeMap = new Map<string, RepositoryNode>();
  const oldToNewNodeIdMap = new Map<string, string>();

  for (const node of input.retainedNodes) {
    const { oldId, newId, remappedNode } = rebindNode(node, newSnapshotId);
    nodeMap.set(newId, remappedNode);
    oldToNewNodeIdMap.set(oldId, newId);
  }
  for (const node of input.addedNodes) {
    nodeMap.set(node.id, node);
    oldToNewNodeIdMap.set(node.id, node.id);
  }

  const edgeMap = new Map<string, RepositoryEdge>();
  for (const edge of input.retainedEdges) {
    const remapped = rebindEdge(edge, newSnapshotId, oldToNewNodeIdMap);
    if (remapped) edgeMap.set(remapped.id, remapped);
  }
  for (const edge of input.addedEdges) {
    edgeMap.set(edge.id, edge);
  }

  return createRepositoryIR({
    snapshot: input.newSnapshot,
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
  });
}

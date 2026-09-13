import type { RepositoryEdge } from './RepositoryEdge';
import { isValidEdge } from './RepositoryEdge';
import type { RepositoryNode } from './RepositoryNode';
import { isValidNode } from './RepositoryNode';
import type { RepositorySnapshot } from './RepositorySnapshot';
import { isValidSnapshot } from './RepositorySnapshot';

export function assertNodeInvariants(node: RepositoryNode): void {
  if (!isValidNode(node)) {
    throw new Error(`Node invariant violated: ${JSON.stringify(node)}`);
  }
}

function assertEdgeSnapshotMatch(edge: RepositoryEdge, targetSnapshotId?: string): void {
  if (targetSnapshotId && edge.snapshotId !== targetSnapshotId) {
    throw new Error(`Edge cross-snapshot violation: edge belongs to ${edge.snapshotId}, expected ${targetSnapshotId}`);
  }
}

function assertEdgeEndpointsExist(edge: RepositoryEdge, knownNodeIds?: ReadonlySet<string>): void {
  if (!knownNodeIds) return;
  if (!knownNodeIds.has(edge.sourceNodeId)) {
    throw new Error(`Edge source node does not exist in graph: ${edge.sourceNodeId}`);
  }
  if (!knownNodeIds.has(edge.targetNodeId)) {
    throw new Error(`Edge target node does not exist in graph: ${edge.targetNodeId}`);
  }
}

function assertDerivedEdgeEvidence(edge: RepositoryEdge): void {
  if (edge.isDerived && edge.evidences.length === 0) {
    throw new Error(`Derived edge must have at least one supporting evidence: ${edge.id}`);
  }
}

export function assertEdgeInvariants(
  edge: RepositoryEdge,
  knownNodeIds?: ReadonlySet<string>,
  targetSnapshotId?: string
): void {
  if (!isValidEdge(edge)) {
    throw new Error(`Edge basic invariant violated: ${JSON.stringify(edge)}`);
  }
  assertEdgeSnapshotMatch(edge, targetSnapshotId);
  assertEdgeEndpointsExist(edge, knownNodeIds);
  assertDerivedEdgeEvidence(edge);
}

export function assertSnapshotInvariants(snapshot: RepositorySnapshot): void {
  if (!isValidSnapshot(snapshot)) {
    throw new Error(`Snapshot invariant violated: ${JSON.stringify(snapshot)}`);
  }
}

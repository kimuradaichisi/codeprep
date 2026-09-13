import { describe, expect, it } from 'vitest';
import {
  assertEdgeInvariants,
  assertNodeInvariants,
  assertSnapshotInvariants,
} from '../RepositoryIRInvariants';
import { createRepositoryNode } from '../RepositoryNode';
import { createRepositoryEdge } from '../RepositoryEdge';
import { createRepositorySnapshot } from '../RepositorySnapshot';

describe('RepositoryIRInvariants', () => {
  const snap = createRepositorySnapshot({
    snapshotId: 'snap-1',
    repositoryId: 'repo-1',
    workspaceRoot: '/workspace',
    createdAt: new Date().toISOString(),
  });

  const nodeA = createRepositoryNode({
    id: 'node:snap-1:file:A.ts',
    snapshotId: 'snap-1',
    kind: 'file',
    name: 'A.ts',
    path: 'A.ts',
  });

  const nodeB = createRepositoryNode({
    id: 'node:snap-1:file:B.ts',
    snapshotId: 'snap-1',
    kind: 'file',
    name: 'B.ts',
    path: 'B.ts',
  });

  it('validates node and snapshot invariants successfully', () => {
    expect(() => assertSnapshotInvariants(snap)).not.toThrow();
    expect(() => assertNodeInvariants(nodeA)).not.toThrow();
  });

  it('throws on cross-snapshot edge violation', () => {
    const edge = createRepositoryEdge({
      id: 'edge-1',
      snapshotId: 'snap-different',
      sourceNodeId: nodeA.id,
      targetNodeId: nodeB.id,
      relationType: 'depends-on',
      isDerived: false,
      confidence: 1.0,
      evidences: [],
    });

    expect(() => assertEdgeInvariants(edge, undefined, 'snap-1')).toThrowError(
      /Edge cross-snapshot violation/
    );
  });

  it('throws when edge points to non-existent node in graph', () => {
    const knownNodes = new Set([nodeA.id]);
    const edge = createRepositoryEdge({
      id: 'edge-2',
      snapshotId: 'snap-1',
      sourceNodeId: nodeA.id,
      targetNodeId: 'node:missing',
      relationType: 'depends-on',
      isDerived: false,
      confidence: 1.0,
      evidences: [],
    });

    expect(() => assertEdgeInvariants(edge, knownNodes)).toThrowError(
      /Edge target node does not exist in graph/
    );
  });

  it('throws when derived edge lacks supporting evidence', () => {
    const knownNodes = new Set([nodeA.id, nodeB.id]);
    const edge = createRepositoryEdge({
      id: 'edge-derived-no-ev',
      snapshotId: 'snap-1',
      sourceNodeId: nodeA.id,
      targetNodeId: nodeB.id,
      relationType: 'may-dispatch-to',
      isDerived: true,
      confidence: 0.8,
      evidences: [],
    });

    expect(() => assertEdgeInvariants(edge, knownNodes)).toThrowError(
      /Derived edge must have at least one supporting evidence/
    );
  });
});

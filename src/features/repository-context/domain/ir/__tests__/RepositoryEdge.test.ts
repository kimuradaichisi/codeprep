import { describe, expect, it } from 'vitest';
import {
  buildEdgeId,
  createRepositoryEdge,
  isValidEdge,
} from '../RepositoryEdge';

describe('RepositoryEdge', () => {
  const snapshotId = 'snap-100';
  const srcNode = 'node:snap-100:sym:A';
  const tgtNode = 'node:snap-100:sym:B';

  it('creates valid edge with confidence and metadata', () => {
    const edgeId = buildEdgeId(snapshotId, srcNode, 'calls', tgtNode);
    const edge = createRepositoryEdge({
      id: edgeId,
      snapshotId,
      sourceNodeId: srcNode,
      targetNodeId: tgtNode,
      relationType: 'calls',
      isDerived: false,
      confidence: 1.0,
      evidences: [],
      metadata: { callKind: 'direct' },
    });

    expect(edge.id).toBe(`edge:${snapshotId}:${srcNode}->calls->${tgtNode}`);
    expect(edge.confidence).toBe(1.0);
    expect(edge.isDerived).toBe(false);
  });

  it('rejects edge with invalid confidence out of bounds', () => {
    const edgeId = buildEdgeId(snapshotId, srcNode, 'calls', tgtNode);
    expect(isValidEdge({
      id: edgeId,
      snapshotId,
      sourceNodeId: srcNode,
      targetNodeId: tgtNode,
      relationType: 'calls',
      isDerived: false,
      confidence: 1.5,
      evidences: [],
    })).toBe(false);

    expect(isValidEdge({
      id: edgeId,
      snapshotId,
      sourceNodeId: srcNode,
      targetNodeId: tgtNode,
      relationType: 'calls',
      isDerived: false,
      confidence: -0.1,
      evidences: [],
    })).toBe(false);
  });

  it('rejects self-loop on non-reflexive asymmetric relations', () => {
    const edgeId = buildEdgeId(snapshotId, srcNode, 'contains', srcNode);
    expect(isValidEdge({
      id: edgeId,
      snapshotId,
      sourceNodeId: srcNode,
      targetNodeId: srcNode,
      relationType: 'contains',
      isDerived: false,
      confidence: 1.0,
      evidences: [],
    })).toBe(false);
  });
});

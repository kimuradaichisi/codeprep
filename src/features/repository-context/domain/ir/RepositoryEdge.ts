import type { RepositoryEvidence } from './RepositoryEvidence';
import { isValidEvidence } from './RepositoryEvidence';
import type { RepositoryRelationType } from './RepositoryRelationType';
import {
  ASYMMETRIC_NON_REFLEXIVE_RELATIONS,
  isValidRelationType,
} from './RepositoryRelationType';

export interface RepositoryEdge {
  readonly id: string;
  readonly snapshotId: string;
  readonly sourceNodeId: string;
  readonly targetNodeId: string;
  readonly relationType: RepositoryRelationType;
  readonly isDerived: boolean;
  readonly evidences: readonly RepositoryEvidence[];
  readonly confidence: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export function isValidEdge(edge: RepositoryEdge): boolean {
  if (!edge.id || edge.id.trim().length === 0) return false;
  if (!edge.snapshotId || edge.snapshotId.trim().length === 0) return false;
  if (!edge.sourceNodeId || edge.sourceNodeId.trim().length === 0) return false;
  if (!edge.targetNodeId || edge.targetNodeId.trim().length === 0) return false;
  if (!isValidRelationType(edge.relationType)) return false;
  if (typeof edge.isDerived !== 'boolean') return false;
  if (typeof edge.confidence !== 'number' || !Number.isFinite(edge.confidence)) return false;
  if (edge.confidence < 0 || edge.confidence > 1) return false;
  if (ASYMMETRIC_NON_REFLEXIVE_RELATIONS.has(edge.relationType) && edge.sourceNodeId === edge.targetNodeId) {
    return false;
  }
  return edge.evidences.every(isValidEvidence);
}

export function createRepositoryEdge(params: RepositoryEdge): RepositoryEdge {
  if (!isValidEdge(params)) {
    throw new Error(`Invalid RepositoryEdge: ${JSON.stringify(params)}`);
  }
  return Object.freeze({
    ...params,
    evidences: Object.freeze([...params.evidences]),
    metadata: params.metadata ? Object.freeze({ ...params.metadata }) : undefined,
  });
}

export function buildEdgeId(
  snapshotId: string,
  sourceNodeId: string,
  relationType: string,
  targetNodeId: string,
  discriminator?: string
): string {
  const suffix = discriminator ? `:${discriminator}` : '';
  return `edge:${snapshotId}:${sourceNodeId}->${relationType}->${targetNodeId}${suffix}`;
}

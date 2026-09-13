import type { RepositoryEdge, RepositorySnapshot } from '../../../domain/ir';
import {
  buildEdgeId,
  buildFileNodeId,
  createEvidence,
  createRepositoryEdge,
} from '../../../domain/ir';
import type { WiringStructuralRelation } from '../composition/WiringRelationDto';

export interface WiringRelationMappingInput {
  readonly relations: readonly WiringStructuralRelation[];
  readonly snapshot: RepositorySnapshot;
  readonly fileNodeIdByPath: ReadonlyMap<string, string>;
  readonly symbolNodeIdByPathAndName?: ReadonlyMap<string, string>;
}

export interface WiringRelationMappingResult {
  readonly edges: readonly RepositoryEdge[];
  readonly unresolvedCount: number;
}

function resolveTargetNodeId(
  targetPath: string,
  symbolName: string,
  fileNodeIdByPath: ReadonlyMap<string, string>,
  symbolLookup?: ReadonlyMap<string, string>
): string | undefined {
  const normPath = targetPath.replace(/\\/g, '/');
  if (symbolLookup) {
    const symKey = `${normPath}#${symbolName}`;
    const foundSym = symbolLookup.get(symKey);
    if (foundSym) return foundSym;
  }
  return fileNodeIdByPath.get(normPath);
}

function buildWiringEvidence(edgeId: string, rel: WiringStructuralRelation) {
  return createEvidence({
    id: `ev:wire:${edgeId}`, category: 'deterministic-ast', analyzer: rel.analyzer,
    confidence: rel.confidence, sourcePath: rel.compositionSite.path,
    sourceLocation: rel.compositionSite.location,
    details: {
      parameterName: rel.parameterName,
      parameterIndex: rel.parameterIndex,
      declaredType: rel.declaredType,
    },
  });
}

function buildWiringEdge(
  rel: WiringStructuralRelation,
  snapshotId: string,
  srcId: string,
  tgtId: string
): RepositoryEdge {
  const loc = rel.compositionSite.location?.startLine?.toString();
  const edgeId = buildEdgeId(snapshotId, srcId, rel.relationType, tgtId, loc);
  return createRepositoryEdge({
    id: edgeId, snapshotId, sourceNodeId: srcId, targetNodeId: tgtId,
    relationType: rel.relationType, isDerived: false, confidence: rel.confidence,
    evidences: [buildWiringEvidence(edgeId, rel)],
  });
}

function mapSingleWiring(
  rel: WiringStructuralRelation,
  snapshot: RepositorySnapshot,
  fileNodeIdByPath: ReadonlyMap<string, string>,
  symbolLookup?: ReadonlyMap<string, string>
): RepositoryEdge | undefined {
  const srcId = resolveTargetNodeId(rel.source.path, rel.source.symbolName, fileNodeIdByPath, symbolLookup)
    ?? buildFileNodeId(snapshot.snapshotId, rel.source.path.replace(/\\/g, '/'));
  const tgtId = resolveTargetNodeId(rel.target.path, rel.target.symbolName, fileNodeIdByPath, symbolLookup);
  if (!srcId || !tgtId || srcId === tgtId) return undefined;
  return buildWiringEdge(rel, snapshot.snapshotId, srcId, tgtId);
}

function appendWiringEdge(edge: RepositoryEdge | undefined, edges: RepositoryEdge[], seenIds: Set<string>): boolean {
  if (!edge) return false;
  if (!seenIds.has(edge.id)) {
    seenIds.add(edge.id);
    edges.push(edge);
  }
  return true;
}

export function mapWiringRelationsToEdges(
  input: WiringRelationMappingInput
): WiringRelationMappingResult {
  const edges: RepositoryEdge[] = [];
  const seenIds = new Set<string>();
  let unresolvedCount = 0;

  for (const rel of input.relations) {
    const edge = mapSingleWiring(rel, input.snapshot, input.fileNodeIdByPath, input.symbolNodeIdByPathAndName);
    if (!appendWiringEdge(edge, edges, seenIds)) unresolvedCount++;
  }

  return Object.freeze({ edges: Object.freeze(edges), unresolvedCount });
}

import type { RepositoryEdge, RepositorySnapshot } from '../../../domain/ir';
import {
  buildEdgeId,
  buildFileNodeId,
  createEvidence,
  createRepositoryEdge,
} from '../../../domain/ir';
import type { LanguageStructuralRelation } from '../language/LanguageRelationDto';

export interface LanguageRelationMappingInput {
  readonly relations: readonly LanguageStructuralRelation[];
  readonly snapshot: RepositorySnapshot;
  readonly fileNodeIdByPath: ReadonlyMap<string, string>;
  readonly symbolNodeIdByPathAndName?: ReadonlyMap<string, string>;
}

export interface LanguageRelationMappingResult {
  readonly edges: readonly RepositoryEdge[];
  readonly unresolvedCount: number;
}

function resolveTargetNodeId(
  rel: LanguageStructuralRelation,
  snapshot: RepositorySnapshot,
  fileNodeIdByPath: ReadonlyMap<string, string>,
  symbolLookup?: ReadonlyMap<string, string>
): string | undefined {
  const normPath = rel.target.path.replace(/\\/g, '/');
  if (symbolLookup) {
    const symKey = `${normPath}#${rel.target.symbolName}`;
    const foundSym = symbolLookup.get(symKey);
    if (foundSym) return foundSym;
  }
  return fileNodeIdByPath.get(normPath);
}

function buildLanguageEvidence(edgeId: string, rel: LanguageStructuralRelation, normSrcPath: string) {
  return createEvidence({
    id: `ev:lang:${edgeId}`, category: 'deterministic-ast', analyzer: rel.analyzer,
    confidence: rel.confidence, sourcePath: normSrcPath, sourceLocation: rel.source.location,
  });
}

function buildLanguageEdge(
  rel: LanguageStructuralRelation,
  snapshotId: string,
  srcId: string,
  tgtId: string,
  normSrcPath: string
): RepositoryEdge {
  const edgeId = buildEdgeId(snapshotId, srcId, rel.relationType, tgtId, rel.source.location?.startLine?.toString());
  return createRepositoryEdge({
    id: edgeId, snapshotId, sourceNodeId: srcId, targetNodeId: tgtId,
    relationType: rel.relationType, isDerived: false, confidence: rel.confidence,
    evidences: [buildLanguageEvidence(edgeId, rel, normSrcPath)],
  });
}

function mapSingleRelation(
  rel: LanguageStructuralRelation,
  snapshot: RepositorySnapshot,
  fileNodeIdByPath: ReadonlyMap<string, string>,
  symbolLookup?: ReadonlyMap<string, string>
): RepositoryEdge | undefined {
  const normSrcPath = rel.source.path.replace(/\\/g, '/');
  const srcId = fileNodeIdByPath.get(normSrcPath) ?? buildFileNodeId(snapshot.snapshotId, normSrcPath);
  const tgtId = resolveTargetNodeId(rel, snapshot, fileNodeIdByPath, symbolLookup);
  if (!srcId || !tgtId || srcId === tgtId) return undefined;
  return buildLanguageEdge(rel, snapshot.snapshotId, srcId, tgtId, normSrcPath);
}

function appendEdge(edge: RepositoryEdge | undefined, edges: RepositoryEdge[], seenIds: Set<string>): boolean {
  if (!edge) return false;
  if (!seenIds.has(edge.id)) {
    seenIds.add(edge.id);
    edges.push(edge);
  }
  return true;
}

export function mapLanguageRelationsToEdges(
  input: LanguageRelationMappingInput
): LanguageRelationMappingResult {
  const edges: RepositoryEdge[] = [];
  const seenIds = new Set<string>();
  let unresolvedCount = 0;

  for (const rel of input.relations) {
    const edge = mapSingleRelation(rel, input.snapshot, input.fileNodeIdByPath, input.symbolNodeIdByPathAndName);
    if (!appendEdge(edge, edges, seenIds)) unresolvedCount++;
  }

  return Object.freeze({ edges: Object.freeze(edges), unresolvedCount });
}

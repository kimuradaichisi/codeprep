import type { RepositoryIndex } from '../../domain/RepositoryIndex';
import type { StructuredKnowledgeIndex } from '../../domain/StructuredKnowledgeIndex';
import type {
  RepositoryEdge,
  RepositoryIR,
  RepositoryNode,
  RepositorySnapshot,
} from '../../domain/ir';
import { createRepositoryIR } from '../../domain/ir';
import {
  mapDependenciesToEdges,
  mapDocGraphRelationsToEdges,
  mapGitCoChangesToEdges,
  mapLanguageRelationsToEdges,
  mapRepositoryIndexToFileNodes,
  mapStructuredKnowledgeToNodesAndEdges,
  mapWiringRelationsToEdges,
  type DocGraphRelationPair,
  type FileDependencyPair,
  type GitCoChangeRelation,
} from './mappers';
import type { LanguageStructuralRelation } from './language';
import type { WiringStructuralRelation } from './composition';

export interface BuildRepositoryIRInput {
  readonly snapshot: RepositorySnapshot;
  readonly repositoryIndex?: RepositoryIndex;
  readonly structuredKnowledgeIndex?: StructuredKnowledgeIndex;
  readonly dependencies?: readonly FileDependencyPair[];
  readonly gitCoChanges?: readonly GitCoChangeRelation[];
  readonly docGraphRelations?: readonly DocGraphRelationPair[];
  readonly languageRelations?: readonly LanguageStructuralRelation[];
  readonly wiringRelations?: readonly WiringStructuralRelation[];
}

function buildFilePathLookup(fileNodes: readonly RepositoryNode[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const node of fileNodes) map.set(node.path, node.id);
  return map;
}

function collectRelationEdges(
  input: BuildRepositoryIRInput,
  fileNodeIdMap: Map<string, string>
): readonly RepositoryEdge[] {
  const depEdges = input.dependencies ? mapDependenciesToEdges(input.dependencies, input.snapshot, fileNodeIdMap) : [];
  const gitEdges = input.gitCoChanges ? mapGitCoChangesToEdges(input.gitCoChanges, input.snapshot, fileNodeIdMap) : [];
  const docEdges = input.docGraphRelations ? mapDocGraphRelationsToEdges(input.docGraphRelations, input.snapshot, fileNodeIdMap) : [];
  const langRes = input.languageRelations ? mapLanguageRelationsToEdges({ relations: input.languageRelations, snapshot: input.snapshot, fileNodeIdByPath: fileNodeIdMap }) : { edges: [] };
  const wireRes = input.wiringRelations ? mapWiringRelationsToEdges({ relations: input.wiringRelations, snapshot: input.snapshot, fileNodeIdByPath: fileNodeIdMap }) : { edges: [] };
  return [...depEdges, ...gitEdges, ...docEdges, ...langRes.edges, ...wireRes.edges];
}

function resolveKnowledge(input: BuildRepositoryIRInput, knownIds: Set<string>) {
  if (!input.structuredKnowledgeIndex) return { nodes: [], edges: [] };
  return mapStructuredKnowledgeToNodesAndEdges(input.structuredKnowledgeIndex, input.snapshot, knownIds);
}

export class BuildRepositoryIRUseCase {
  public execute(input: BuildRepositoryIRInput): RepositoryIR {
    const fileNodes = input.repositoryIndex ? mapRepositoryIndexToFileNodes(input.repositoryIndex, input.snapshot) : [];
    const fileNodeIdMap = buildFilePathLookup(fileNodes);
    const skResult = resolveKnowledge(input, new Set(fileNodeIdMap.values()));
    const relEdges = collectRelationEdges(input, fileNodeIdMap);
    return createRepositoryIR({
      snapshot: input.snapshot,
      nodes: [...fileNodes, ...skResult.nodes],
      edges: [...skResult.edges, ...relEdges],
    });
  }
}


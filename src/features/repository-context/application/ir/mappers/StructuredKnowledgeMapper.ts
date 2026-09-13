import type { StructuredKnowledgeIndex } from '../../../domain/StructuredKnowledgeIndex';
import type { RepositoryEdge, RepositoryNode, RepositorySnapshot } from '../../../domain/ir';
import { buildFileNodeId } from '../../../domain/ir';
import { mapCodeSymbol } from './StructuredKnowledgeSymbolMapper';
import { mapDocSection } from './StructuredKnowledgeDocMapper';

export interface StructuredKnowledgeMappingResult {
  readonly nodes: readonly RepositoryNode[];
  readonly edges: readonly RepositoryEdge[];
}

function mapKnowledgeEntry(
  entry: StructuredKnowledgeIndex['entries'][number],
  snapshot: RepositorySnapshot,
  fileNodeId: string
): { node: RepositoryNode; edge: RepositoryEdge } | undefined {
  if (entry.kind === 'code-symbol') return mapCodeSymbol(entry, snapshot, fileNodeId);
  if (entry.kind === 'markdown-section') return mapDocSection(entry, snapshot, fileNodeId);
  return undefined;
}

export function mapStructuredKnowledgeToNodesAndEdges(
  index: StructuredKnowledgeIndex,
  snapshot: RepositorySnapshot,
  knownFileNodeIds: ReadonlySet<string>
): StructuredKnowledgeMappingResult {
  const nodes: RepositoryNode[] = [];
  const edges: RepositoryEdge[] = [];
  for (const entry of index.entries) {
    const fileId = buildFileNodeId(snapshot.snapshotId, entry.relativePath);
    if (!knownFileNodeIds.has(fileId)) continue;
    const mapped = mapKnowledgeEntry(entry, snapshot, fileId);
    if (mapped) { nodes.push(mapped.node); edges.push(mapped.edge); }
  }
  return Object.freeze({ nodes: Object.freeze(nodes), edges: Object.freeze(edges) });
}

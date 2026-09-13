import type { CodeSymbolEntry } from '../../../domain/CodeSymbolEntry';
import type { RepositoryEdge, RepositoryNode, RepositorySnapshot } from '../../../domain/ir';
import {
  buildEdgeId,
  buildSymbolNodeId,
  createEvidence,
  createRepositoryEdge,
  createRepositoryNode,
} from '../../../domain/ir';

function buildSymbolMetadata(entry: CodeSymbolEntry): Record<string, unknown> {
  return {
    symbolKind: entry.symbolKind,
    containerName: entry.containerName,
    signature: entry.signature,
    hasDocComment: Boolean(entry.docComment),
  };
}

export function createCodeSymbolNode(
  entry: CodeSymbolEntry,
  snapshotId: string,
  nodeId: string,
  normPath: string
): RepositoryNode {
  const name = entry.containerName ? `${entry.containerName}.${entry.symbolName}` : entry.symbolName;
  const loc = { startLine: entry.startLine, endLine: entry.endLine };
  return createRepositoryNode({
    id: nodeId, snapshotId, kind: 'symbol', name, path: normPath,
    location: loc, language: 'typescript', metadata: buildSymbolMetadata(entry),
  });
}

function createSymbolEvidence(nodeId: string, normPath: string, entry: CodeSymbolEntry) {
  return createEvidence({
    id: `ev:ast:${nodeId}`, category: 'deterministic-ast', analyzer: 'typescript-symbol-extractor',
    confidence: 1.0, sourcePath: normPath, sourceLocation: { startLine: entry.startLine, endLine: entry.endLine },
  });
}

export function createCodeSymbolEdge(
  fileNodeId: string,
  nodeId: string,
  snapshotId: string,
  normPath: string,
  entry: CodeSymbolEntry
): RepositoryEdge {
  return createRepositoryEdge({
    id: buildEdgeId(snapshotId, fileNodeId, 'contains', nodeId),
    snapshotId, sourceNodeId: fileNodeId, targetNodeId: nodeId,
    relationType: 'contains', isDerived: false, confidence: 1.0,
    evidences: [createSymbolEvidence(nodeId, normPath, entry)],
  });
}

export function mapCodeSymbol(
  entry: CodeSymbolEntry,
  snapshot: RepositorySnapshot,
  fileNodeId: string
): { node: RepositoryNode; edge: RepositoryEdge } {
  const normPath = entry.relativePath.replace(/\\/g, '/');
  const nodeId = buildSymbolNodeId(snapshot.snapshotId, normPath, entry.symbolKind, entry.symbolName, entry.startLine);
  const node = createCodeSymbolNode(entry, snapshot.snapshotId, nodeId, normPath);
  const edge = createCodeSymbolEdge(fileNodeId, nodeId, snapshot.snapshotId, normPath, entry);
  return { node, edge };
}

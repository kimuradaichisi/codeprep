import type { MarkdownSectionEntry } from '../../../domain/MarkdownSectionEntry';
import type { RepositoryEdge, RepositoryNode, RepositorySnapshot } from '../../../domain/ir';
import {
  buildEdgeId,
  createEvidence,
  createRepositoryEdge,
  createRepositoryNode,
} from '../../../domain/ir';

export function createDocSectionNode(
  entry: MarkdownSectionEntry,
  snapshotId: string,
  nodeId: string,
  normPath: string
): RepositoryNode {
  const loc = { startLine: entry.startLine, endLine: entry.endLine };
  return createRepositoryNode({
    id: nodeId, snapshotId, kind: 'doc-section', name: entry.headingText || 'root-section',
    path: normPath, location: loc, language: 'markdown',
    metadata: { headingLevel: entry.headingLevel, headingPath: entry.headingPath },
  });
}

function createDocEvidence(nodeId: string, normPath: string, entry: MarkdownSectionEntry) {
  return createEvidence({
    id: `ev:md:${nodeId}`, category: 'deterministic-ast', analyzer: 'markdown-section-extractor',
    confidence: 1.0, sourcePath: normPath, sourceLocation: { startLine: entry.startLine, endLine: entry.endLine },
  });
}

export function createDocSectionEdge(
  fileNodeId: string,
  nodeId: string,
  snapshotId: string,
  normPath: string,
  entry: MarkdownSectionEntry
): RepositoryEdge {
  return createRepositoryEdge({
    id: buildEdgeId(snapshotId, fileNodeId, 'contains', nodeId),
    snapshotId, sourceNodeId: fileNodeId, targetNodeId: nodeId,
    relationType: 'contains', isDerived: false, confidence: 1.0,
    evidences: [createDocEvidence(nodeId, normPath, entry)],
  });
}

export function mapDocSection(
  entry: MarkdownSectionEntry,
  snapshot: RepositorySnapshot,
  fileNodeId: string
): { node: RepositoryNode; edge: RepositoryEdge } {
  const normPath = entry.relativePath.replace(/\\/g, '/');
  const nodeId = `node:${snapshot.snapshotId}:doc:${normPath}#L${entry.startLine}`;
  const node = createDocSectionNode(entry, snapshot.snapshotId, nodeId, normPath);
  const edge = createDocSectionEdge(fileNodeId, nodeId, snapshot.snapshotId, normPath, entry);
  return { node, edge };
}

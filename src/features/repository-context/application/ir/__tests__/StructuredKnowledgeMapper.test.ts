import { describe, expect, it } from 'vitest';
import type { StructuredKnowledgeIndex } from '../../../domain/StructuredKnowledgeIndex';
import { buildFileNodeId, createRepositorySnapshot } from '../../../domain/ir';
import { mapStructuredKnowledgeToNodesAndEdges } from '../mappers/StructuredKnowledgeMapper';

describe('StructuredKnowledgeMapper', () => {
  const snapshot = createRepositorySnapshot({
    snapshotId: 'snap-1',
    repositoryId: 'repo-1',
    workspaceRoot: '/workspace',
    createdAt: '2026-09-13T00:00:00Z',
  });

  const fileNodeId = buildFileNodeId(snapshot.snapshotId, 'src/app.ts');
  const knownFiles = new Set([fileNodeId]);

  it('maps code symbols and markdown sections to nodes and CONTAINS edges with provenance', () => {
    const index: StructuredKnowledgeIndex = {
      metadata: {
        projectId: 'repo-1',
        indexedAt: '2026-09-13T00:00:00Z',
        schemaVersion: 1,
        totalEntries: 2,
        markdownSectionCount: 0,
        codeSymbolCount: 2,
      },
      entries: [
        {
          entryId: 'e1',
          projectId: 'repo-1',
          relativePath: 'src/app.ts',
          kind: 'code-symbol',
          symbolName: 'run',
          symbolKind: 'function',
          startLine: 5,
          endLine: 15,
          signature: 'function run(): void',
        },
      ],
    };

    const result = mapStructuredKnowledgeToNodesAndEdges(index, snapshot, knownFiles);
    expect(result.nodes).toHaveLength(1);
    expect(result.edges).toHaveLength(1);

    const node = result.nodes[0];
    expect(node.kind).toBe('symbol');
    expect(node.name).toBe('run');
    expect(node.location?.startLine).toBe(5);

    const edge = result.edges[0];
    expect(edge.relationType).toBe('contains');
    expect(edge.sourceNodeId).toBe(fileNodeId);
    expect(edge.targetNodeId).toBe(node.id);
    expect(edge.evidences[0].category).toBe('deterministic-ast');
    expect(edge.evidences[0].analyzer).toBe('typescript-symbol-extractor');
  });

  it('drops orphans whose parent file node does not exist', () => {
    const index: StructuredKnowledgeIndex = {
      metadata: {
        projectId: 'repo-1',
        indexedAt: '2026-09-13T00:00:00Z',
        schemaVersion: 1,
        totalEntries: 1,
        markdownSectionCount: 0,
        codeSymbolCount: 1,
      },
      entries: [
        {
          entryId: 'e-orphan',
          projectId: 'repo-1',
          relativePath: 'src/orphan.ts',
          kind: 'code-symbol',
          symbolName: 'orphanFunc',
          symbolKind: 'function',
          startLine: 1,
          endLine: 2,
          signature: 'function orphanFunc(): void',
        },
      ],
    };

    const result = mapStructuredKnowledgeToNodesAndEdges(index, snapshot, knownFiles);
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });
});

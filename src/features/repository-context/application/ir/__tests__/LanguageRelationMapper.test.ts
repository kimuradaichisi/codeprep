import { describe, expect, it } from 'vitest';
import { createRepositorySnapshot } from '../../../domain/ir';
import { mapLanguageRelationsToEdges } from '../mappers/LanguageRelationMapper';
import type { LanguageStructuralRelation } from '../language/LanguageRelationDto';

describe('LanguageRelationMapper', () => {
  const snapshot = createRepositorySnapshot({
    snapshotId: 'snap-1',
    repositoryId: 'repo-1',
    workspaceRoot: '/workspace',
    createdAt: '2026-09-13T00:00:00Z',
  });

  const fileMap = new Map([
    ['src/adapter.ts', 'node:snap-1:file:src/adapter.ts'],
    ['src/port.ts', 'node:snap-1:file:src/port.ts'],
  ]);

  it('maps IMPLEMENTS relation to RepositoryEdge with deterministic-ast provenance', () => {
    const relations: LanguageStructuralRelation[] = [{
      source: { path: 'src/adapter.ts', symbolName: 'VSCodeAdapter', symbolKind: 'class', location: { startLine: 10, endLine: 20 } },
      target: { path: 'src/port.ts', symbolName: 'Port', symbolKind: 'interface', location: { startLine: 5, endLine: 8 } },
      relationType: 'implements',
      confidence: 1.0,
      analyzer: 'typescript-compiler',
    }];

    const result = mapLanguageRelationsToEdges({ relations, snapshot, fileNodeIdByPath: fileMap });
    expect(result.edges).toHaveLength(1);
    expect(result.unresolvedCount).toBe(0);

    const edge = result.edges[0];
    expect(edge.relationType).toBe('implements');
    expect(edge.sourceNodeId).toBe('node:snap-1:file:src/adapter.ts');
    expect(edge.targetNodeId).toBe('node:snap-1:file:src/port.ts');
    expect(edge.isDerived).toBe(false);
    expect(edge.confidence).toBe(1.0);
    expect(edge.evidences[0].category).toBe('deterministic-ast');
  });

  it('tracks unresolved count when target file cannot be resolved without fabricating nodes', () => {
    const relations: LanguageStructuralRelation[] = [{
      source: { path: 'src/adapter.ts', symbolName: 'VSCodeAdapter', symbolKind: 'class' },
      target: { path: 'src/unknown.ts', symbolName: 'UnknownPort', symbolKind: 'interface' },
      relationType: 'implements',
      confidence: 1.0,
      analyzer: 'typescript-compiler',
    }];

    const result = mapLanguageRelationsToEdges({ relations, snapshot, fileNodeIdByPath: fileMap });
    expect(result.edges).toHaveLength(0);
    expect(result.unresolvedCount).toBe(1);
  });
});

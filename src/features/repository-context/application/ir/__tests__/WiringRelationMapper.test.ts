import { describe, expect, it } from 'vitest';
import { createRepositorySnapshot } from '../../../domain/ir';
import type { WiringStructuralRelation } from '../composition/WiringRelationDto';
import { mapWiringRelationsToEdges } from '../mappers/WiringRelationMapper';

describe('WiringRelationMapper', () => {
  const snapshot = createRepositorySnapshot({
    snapshotId: 'snap-test',
    repositoryId: 'repo-test',
    workspaceRoot: '/test',
    createdAt: '2026-09-13T00:00:00Z',
  });

  const fileNodeIdByPath = new Map<string, string>([
    ['src/domain/Port.ts', 'node:file:port'],
    ['src/infra/Impl.ts', 'node:file:impl'],
    ['src/app/Consumer.ts', 'node:file:consumer'],
  ]);

  it('maps BINDS_TO and INJECTS relations to RepositoryEdge', () => {
    const relations: WiringStructuralRelation[] = [
      {
        relationType: 'binds_to',
        source: { path: 'src/domain/Port.ts', symbolName: 'Port', symbolKind: 'interface' },
        target: { path: 'src/infra/Impl.ts', symbolName: 'Impl', symbolKind: 'class' },
        compositionSite: { path: 'src/comp/site.ts', location: { startLine: 10, endLine: 10, startColumn: 1, endColumn: 20 } },
        parameterName: 'port',
        parameterIndex: 0,
        declaredType: 'Port',
        confidence: 1.0,
        analyzer: 'typescript-manual-composition',
      },
      {
        relationType: 'injects',
        source: { path: 'src/app/Consumer.ts', symbolName: 'Consumer', symbolKind: 'class' },
        target: { path: 'src/infra/Impl.ts', symbolName: 'Impl', symbolKind: 'class' },
        compositionSite: { path: 'src/comp/site.ts', location: { startLine: 10, endLine: 10, startColumn: 1, endColumn: 20 } },
        parameterName: 'port',
        parameterIndex: 0,
        declaredType: 'Port',
        confidence: 1.0,
        analyzer: 'typescript-manual-composition',
      },
    ];

    const result = mapWiringRelationsToEdges({ relations, snapshot, fileNodeIdByPath });
    expect(result.edges).toHaveLength(2);
    expect(result.unresolvedCount).toBe(0);

    const bindsEdge = result.edges.find(e => e.relationType === 'binds_to')!;
    expect(bindsEdge.sourceNodeId).toBe('node:file:port');
    expect(bindsEdge.targetNodeId).toBe('node:file:impl');
    expect(bindsEdge.evidences[0].category).toBe('deterministic-ast');
    expect(bindsEdge.evidences[0].analyzer).toBe('typescript-manual-composition');

    const injectsEdge = result.edges.find(e => e.relationType === 'injects')!;
    expect(injectsEdge.sourceNodeId).toBe('node:file:consumer');
    expect(injectsEdge.targetNodeId).toBe('node:file:impl');
  });

  it('safely skips unresolved targets without creating bogus edges', () => {
    const relations: WiringStructuralRelation[] = [
      {
        relationType: 'binds_to',
        source: { path: 'src/unknown/Port.ts', symbolName: 'Port', symbolKind: 'interface' },
        target: { path: 'src/unknown/Impl.ts', symbolName: 'Impl', symbolKind: 'class' },
        compositionSite: { path: 'src/comp/site.ts' },
        confidence: 1.0,
        analyzer: 'typescript-manual-composition',
      },
    ];

    const result = mapWiringRelationsToEdges({ relations, snapshot, fileNodeIdByPath });
    expect(result.edges).toHaveLength(0);
    expect(result.unresolvedCount).toBe(1);
  });
});

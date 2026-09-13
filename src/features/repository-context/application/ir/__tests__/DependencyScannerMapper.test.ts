import { describe, expect, it } from 'vitest';
import { createRepositorySnapshot } from '../../../domain/ir';
import { mapDependenciesToEdges } from '../mappers/DependencyScannerMapper';

describe('DependencyScannerMapper', () => {
  const snapshot = createRepositorySnapshot({
    snapshotId: 'snap-1',
    repositoryId: 'repo-1',
    workspaceRoot: '/workspace',
    createdAt: '2026-09-13T00:00:00Z',
  });

  const fileNodeMap = new Map([
    ['src/a.ts', 'node:snap-1:file:src/a.ts'],
    ['src/b.ts', 'node:snap-1:file:src/b.ts'],
  ]);

  it('maps dependency pairs to DEPENDS_ON edges with regex-pattern provenance', () => {
    const pairs = [{ fromPath: 'src/a.ts', toPath: 'src/b.ts' }];
    const edges = mapDependenciesToEdges(pairs, snapshot, fileNodeMap);

    expect(edges).toHaveLength(1);
    const edge = edges[0];
    expect(edge.relationType).toBe('depends-on');
    expect(edge.sourceNodeId).toBe('node:snap-1:file:src/a.ts');
    expect(edge.targetNodeId).toBe('node:snap-1:file:src/b.ts');
    expect(edge.confidence).toBe(0.8);
    expect(edge.evidences[0].category).toBe('regex-pattern');
    expect(edge.evidences[0].analyzer).toBe('dependency-scanner');
  });

  it('skips unresolved dependencies without fabricating target nodes', () => {
    const pairs = [{ fromPath: 'src/a.ts', toPath: 'src/unresolved.ts' }];
    const edges = mapDependenciesToEdges(pairs, snapshot, fileNodeMap);

    expect(edges).toHaveLength(0);
  });
});

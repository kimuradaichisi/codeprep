import { describe, expect, it } from 'vitest';
import { createRepositorySnapshot } from '../../../domain/ir';
import {
  mapDocGraphRelationsToEdges,
  mapGitCoChangesToEdges,
} from '../mappers/DerivedRelationMapper';

describe('DerivedRelationMapper', () => {
  const snapshot = createRepositorySnapshot({
    snapshotId: 'snap-1',
    repositoryId: 'repo-1',
    workspaceRoot: '/workspace',
    createdAt: '2026-09-13T00:00:00Z',
  });

  const fileMap = new Map([
    ['src/app.ts', 'node:snap-1:file:src/app.ts'],
    ['docs/app.md', 'node:snap-1:file:docs/app.md'],
  ]);

  it('maps GitCoChange to co-changed-with derived edges with git-history provenance', () => {
    const gitRels = [{ fromPath: 'src/app.ts', toPath: 'docs/app.md', count: 5 }];
    const edges = mapGitCoChangesToEdges(gitRels, snapshot, fileMap);

    expect(edges).toHaveLength(1);
    const edge = edges[0];
    expect(edge.relationType).toBe('co-changed-with');
    expect(edge.isDerived).toBe(true);
    expect(edge.confidence).toBe(0.5);
    expect(edge.evidences[0].category).toBe('git-history');
    expect(edge.evidences[0].analyzer).toBe('git-cochange');
  });

  it('maps DocGraph relations to doc-relation derived edges', () => {
    const docRels = [{ fromPath: 'src/app.ts', toPath: 'docs/app.md', reason: 'doc reference', confidence: 0.9 }];
    const edges = mapDocGraphRelationsToEdges(docRels, snapshot, fileMap);

    expect(edges).toHaveLength(1);
    const edge = edges[0];
    expect(edge.relationType).toBe('doc-relation');
    expect(edge.isDerived).toBe(true);
    expect(edge.confidence).toBe(0.9);
    expect(edge.evidences[0].category).toBe('rule-derived');
    expect(edge.evidences[0].analyzer).toBe('docgraph');
  });
});

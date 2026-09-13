import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { createRepositorySnapshot, type RepositoryEdge } from '../../../../domain/ir';
import { ProductionRepositoryKnowledgeBuilder } from '../../../evaluation/ProductionRepositoryKnowledgeBuilder';
import { SqliteRepositoryKnowledgeStore } from '../SqliteRepositoryKnowledgeStore';

function countRelations(edges: readonly RepositoryEdge[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const edge of edges) counts[edge.relationType] = (counts[edge.relationType] ?? 0) + 1;
  return counts;
}

describe('SqliteRepositoryKnowledgeStore Production Pipeline Smoke', () => {
  const workspaceRoot = path.resolve(__dirname, '../../../../../../../');
  const tempDbPath = path.join(os.tmpdir(), `codeprep-prod-smoke-${Date.now()}.db`);
  let store: SqliteRepositoryKnowledgeStore | undefined;

  afterAll(() => {
    store?.close();
    if (fs.existsSync(tempDbPath)) {
      try { fs.unlinkSync(tempDbPath); } catch { /* ignore */ }
    }
  });

  it('verifies zero relation-loss persistence across all 8 production relation types using unified builder', async () => {
    const snapshot = createRepositorySnapshot({
      snapshotId: 'prod-smoke-full', repositoryId: 'codeprep-repo',
      workspaceRoot, revision: 'prod-head', createdAt: new Date().toISOString(),
    });

    const builder = new ProductionRepositoryKnowledgeBuilder();
    const { ir: builtIR } = await builder.buildFullIR(workspaceRoot, snapshot);

    store = new SqliteRepositoryKnowledgeStore({ workspaceRoot, dbPath: tempDbPath });
    await store.save(builtIR);

    const beforeCounts = countRelations(builtIR.edges);
    const loadedIr = await store.load(snapshot.snapshotId);
    expect(loadedIr).toBeDefined();
    const afterCounts = countRelations(loadedIr!.edges);

    const expectedTypes = [
      'references', 'implements', 'extends', 'binds_to', 'injects',
      'depends-on', 'co-changed-with', 'doc-relation',
    ];

    for (const relType of expectedTypes) {
      expect(beforeCounts[relType], `Before-save count for ${relType} must be > 0`).toBeGreaterThan(0);
      expect(afterCounts[relType], `Persistence fidelity for ${relType} must match exactly`).toBe(beforeCounts[relType]);
    }

    expect(loadedIr!.edges.length).toBe(builtIR.edges.length);
    expect(loadedIr!.nodes.size).toBe(builtIR.nodes.size);
  }, 90000);
});

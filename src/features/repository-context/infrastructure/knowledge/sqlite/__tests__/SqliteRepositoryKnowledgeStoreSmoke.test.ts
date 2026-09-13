import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { createRepositorySnapshot } from '../../../../domain/ir';
import { BuildRepositoryKnowledgeUseCase } from '../../../../application/ir/usecases/BuildRepositoryKnowledgeUseCase';
import { createAnalysisSession } from '../../../language/typescript/TypeScriptAnalysisSession';
import { TypeScriptLanguageAdapter } from '../../../language/typescript/TypeScriptLanguageAdapter';
import { TypeScriptWiringAdapter } from '../../../composition/typescript/TypeScriptWiringAdapter';
import { SqliteRepositoryKnowledgeStore } from '../SqliteRepositoryKnowledgeStore';

/**
 * Note: このテストは TypeScript Language & Wiring に焦点を当てた Focused Smoke です。
 * 高速実行のため一部 Producer（DependencyScanner, GitCoChange, DocGraph）を意図的に省略しています。
 * 全 8 種の Relation Type を網羅した Production 相当の統合 Smoke は
 * `SqliteRepositoryKnowledgeStoreProductionSmoke.test.ts` を参照してください。
 */
describe('SqliteRepositoryKnowledgeStore Real Repository Smoke & Benchmark', () => {
  const workspaceRoot = path.resolve(__dirname, '../../../../../../../');
  const tempDbPath = path.join(os.tmpdir(), `codeprep-knowledge-smoke-${Date.now()}.db`);
  let store: SqliteRepositoryKnowledgeStore | undefined;

  afterAll(() => {
    store?.close();
    if (fs.existsSync(tempDbPath)) {
      try {
        fs.unlinkSync(tempDbPath);
      } catch {
        // ignore
      }
    }
  });

  it('builds IR from real repository, persists to SQLite, loads back, and queries neighbors', async () => {
    // 1. Session & Extraction
    const session = createAnalysisSession(workspaceRoot);
    const langAdapter = new TypeScriptLanguageAdapter(session);
    const wiringAdapter = new TypeScriptWiringAdapter(session);

    const langResult = await langAdapter.analyze({ workspaceRoot });
    const wiringResult = await wiringAdapter.analyze({ workspaceRoot });

    const snapshot = createRepositorySnapshot({
      snapshotId: 'smoke-snapshot-1',
      repositoryId: 'codeprep-repo',
      workspaceRoot,
      revision: 'smoke-test-head',
      createdAt: new Date().toISOString(),
    });

    const rootFiles = session.program.getRootFileNames();
    const repositoryIndex = {
      metadata: {
        workspaceId: 'codeprep',
        schemaVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      entries: rootFiles
        .map((f: string) => path.relative(workspaceRoot, f).replace(/\\/g, '/'))
        .filter((rel: string) => !rel.startsWith('node_modules') && !rel.startsWith('..'))
        .map((relativePath: string) => ({
          projectId: 'codeprep',
          relativePath,
          kind: 'code' as const,
          size: 100,
          contentHash: 'smoke-hash',
        })),
    };

    // 2. Setup SQLite store
    store = new SqliteRepositoryKnowledgeStore({
      workspaceRoot,
      dbPath: tempDbPath,
    });

    // 3. Build & Persist
    const buildUseCase = new BuildRepositoryKnowledgeUseCase();
    const saveStart = Date.now();
    const buildResult = await buildUseCase.execute({
      snapshot,
      repositoryIndex,
      languageRelations: langResult.relations,
      wiringRelations: wiringResult.relations,
      store,
    });
    const saveDurationMs = Date.now() - saveStart;
    const originalIr = buildResult.ir;

    // 4. DB File Size
    const dbSize = fs.statSync(tempDbPath).size;

    // 5. Load
    const loadStart = Date.now();
    const loadedIr = await store.load(snapshot.snapshotId);
    const loadDurationMs = Date.now() - loadStart;

    expect(loadedIr).toBeDefined();
    if (!loadedIr) return;

    // 6. Statistics & Relation breakdown
    const stats = await store.getStatistics(snapshot.snapshotId);
    const queryStart = Date.now();
    const sampleNode = Array.from(originalIr.nodes.values())[0];
    const neighborResult = sampleNode
      ? await store.queryNeighbors({ snapshotId: snapshot.snapshotId, nodeId: sampleNode.id })
      : { targetNodes: [], edges: [] };
    const queryDurationMs = Date.now() - queryStart;

    const relationCounts = new Map<string, number>();
    for (const edge of originalIr.edges) {
      relationCounts.set(edge.relationType, (relationCounts.get(edge.relationType) ?? 0) + 1);
    }

    console.log('[Phase 7E Persistence Benchmark & Sanity Check]');
    console.log(`- DB File: ${tempDbPath} (${(dbSize / 1024).toFixed(2)} KB)`);
    console.log(`- Save Time: ${saveDurationMs}ms`);
    console.log(`- Load Time: ${loadDurationMs}ms`);
    console.log(`- Neighbor Query Time: ${queryDurationMs}ms`);
    console.log(`- Node Count: ${originalIr.nodes.size} (DB Stats: ${stats.nodeCount})`);
    console.log(`- Edge Count: ${originalIr.edges.length} (DB Stats: ${stats.edgeCount})`);
    console.log(`- Evidence Count: ${stats.evidenceCount}`);
    console.log('--- Relation Breakdown ---');
    for (const [rel, count] of relationCounts.entries()) {
      console.log(`  - ${rel}: ${count}`);
    }

    // 7. Fidelity Assertions
    expect(loadedIr.snapshot.snapshotId).toBe(originalIr.snapshot.snapshotId);
    expect(loadedIr.nodes.size).toBe(originalIr.nodes.size);
    expect(loadedIr.edges.length).toBe(originalIr.edges.length);
    expect(stats.nodeCount).toBe(originalIr.nodes.size);
    expect(stats.edgeCount).toBe(originalIr.edges.length);
    expect(neighborResult.targetNodes).toBeDefined();
    expect(neighborResult.edges).toBeDefined();
  }, 90000);
});

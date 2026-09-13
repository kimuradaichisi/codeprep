import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRepositorySnapshot } from '../../src/features/repository-context/domain/ir';
import { SqliteRepositoryKnowledgeStore } from '../../src/features/repository-context/infrastructure/knowledge/sqlite/SqliteRepositoryKnowledgeStore';
import { RepositoryRefreshEvaluator } from '../../src/features/repository-context/infrastructure/evaluation/RepositoryRefreshEvaluator';
import { ProductionRepositoryKnowledgeBuilder } from '../../src/features/repository-context/infrastructure/evaluation/ProductionRepositoryKnowledgeBuilder';
import { evaluateKnownPaths, loadKnownPathCases } from './knownPathsEval';
import { outputHarnessResult } from './commandRunner';
import type { RepositoryEvalResult } from './types';

async function measureStoreQueries(store: SqliteRepositoryKnowledgeStore, snapshotId: string, sampleNodeId?: string) {
  const tLoad = Date.now();
  await store.load(snapshotId);
  const loadMs = Date.now() - tLoad;

  const tQuery = Date.now();
  if (sampleNodeId) await store.queryNeighbors({ snapshotId, nodeId: sampleNodeId });
  const neighborQueryMs = Date.now() - tQuery;

  const stats = await store.getStatistics(snapshotId);
  await store.close();
  return { loadMs, neighborQueryMs, stats };
}

async function persistAndMeasureStore(workspaceRoot: string, dbPath: string) {
  const t0 = Date.now();
  const store = new SqliteRepositoryKnowledgeStore({ workspaceRoot, dbPath });
  const snapshot = createRepositorySnapshot({
    snapshotId: `eval-${Date.now()}`, repositoryId: 'codeprep-repo',
    workspaceRoot, revision: 'eval-head', createdAt: new Date().toISOString(),
  });

  const builder = new ProductionRepositoryKnowledgeBuilder();
  const buildResult = await builder.buildFullIR(workspaceRoot, snapshot);

  const tSave = Date.now();
  await store.save(buildResult.ir);
  const saveMs = Date.now() - tSave;

  const sampleNodeId = Array.from<string>(buildResult.ir.nodes.keys())[0];
  const { loadMs, neighborQueryMs, stats } = await measureStoreQueries(store, snapshot.snapshotId, sampleNodeId);

  return {
    snapshot,
    fileCount: buildResult.fileEntries.length,
    ir: buildResult.ir,
    stats,
    timings: {
      sessionSetupMs: 0,
      languageAnalysisMs: buildResult.durationMs.languageMs,
      wiringAnalysisMs: buildResult.durationMs.wiringMs,
      dependencyMs: buildResult.durationMs.dependencyMs,
      gitCoChangeMs: buildResult.durationMs.gitCoChangeMs,
      docGraphMs: buildResult.durationMs.docGraphMs,
      saveMs, loadMs, neighborQueryMs,
      totalMs: Date.now() - t0,
    },
  };
}

function saveEvalArtifacts(workspaceRoot: string, phase: string, result: RepositoryEvalResult): void {
  const outputDir = path.resolve(workspaceRoot, '.codeprep/dev-harness', phase);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'repository-eval.json'), JSON.stringify(result, null, 2), 'utf-8');
}

function printEvalSummary(res: RepositoryEvalResult, phase: string): void {
  console.log(`[Repository Evaluation: ${phase}]`);
  console.log(`- Nodes: ${res.nodes}, Edges: ${res.edges}, Evidence: ${res.evidence}`);
  console.log(`- DB Size: ${((res.performance.dbSizeBytes ?? 0) / 1024).toFixed(2)} KB`);
  console.log(`- Performance: Save=${res.performance.saveMs}ms, Load=${res.performance.loadMs}ms, Total=${res.performance.totalMs}ms`);
  console.log(`- Known Paths: ${res.knownPaths.passed}/${res.knownPaths.total} PASS`);
  if (res.refresh) {
    console.log(`- Incremental Refresh: ${res.refresh.status}, Inc=${res.refresh.incrementalMs}ms vs Full=${res.refresh.fullRebuildMs}ms, Oracle=${res.refresh.oracleMatch ? 'PASS' : 'FAIL'}`);
  }
}

function countRelations(edges: readonly { relationType: string }[]): Record<string, number> {
  const relations: Record<string, number> = {};
  for (const edge of edges) relations[edge.relationType] = (relations[edge.relationType] ?? 0) + 1;
  return relations;
}

export async function executeRepositoryEval(phase = 'current', format: 'text' | 'json' = 'text'): Promise<RepositoryEvalResult> {
  const workspaceRoot = process.cwd();
  const memStart = process.memoryUsage().heapUsed;
  const dbPath = path.join(workspaceRoot, '.codeprep', 'repository-knowledge.db');

  const { snapshot, fileCount, ir, stats, timings } = await persistAndMeasureStore(workspaceRoot, dbPath);
  const knownCases = loadKnownPathCases();
  const knownPaths = await evaluateKnownPaths(knownCases, dbPath);
  const relations = countRelations(ir.edges);
  const refresh = await new RepositoryRefreshEvaluator().evaluate(workspaceRoot, dbPath);

  const memEnd = process.memoryUsage().heapUsed;
  const result: RepositoryEvalResult = {
    snapshotId: snapshot.snapshotId,
    files: fileCount,
    nodes: stats.nodeCount,
    edges: stats.edgeCount,
    evidence: stats.evidenceCount,
    relations: Object.freeze(relations),
    knownPaths,
    refresh,
    performance: { ...timings, dbSizeBytes: stats.dbSizeBytes, heapDeltaMb: Number(((memEnd - memStart) / 1024 / 1024).toFixed(2)) },
  };

  saveEvalArtifacts(workspaceRoot, phase, result);
  outputHarnessResult(result, format, () => printEvalSummary(result, phase));
  return result;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const phase = args.find((_, i) => args[i - 1] === '--phase') ?? args.find(a => !a.startsWith('--')) ?? 'current';
  const format = args.includes('--format') && args[args.indexOf('--format') + 1] === 'json' ? 'json' : 'text';
  executeRepositoryEval(phase, format).catch(err => {
    process.stderr.write(`Repository evaluation error: ${err.message}\n`);
    process.exit(1);
  });
}

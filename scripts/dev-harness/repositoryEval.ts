import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRepositorySnapshot } from '../../src/features/repository-context/domain/ir';
import { BuildRepositoryKnowledgeUseCase } from '../../src/features/repository-context/application/ir/usecases/BuildRepositoryKnowledgeUseCase';
import { createAnalysisSession } from '../../src/features/repository-context/infrastructure/language/typescript/TypeScriptAnalysisSession';
import { TypeScriptLanguageAdapter } from '../../src/features/repository-context/infrastructure/language/typescript/TypeScriptLanguageAdapter';
import { TypeScriptWiringAdapter } from '../../src/features/repository-context/infrastructure/composition/typescript/TypeScriptWiringAdapter';
import { SqliteRepositoryKnowledgeStore } from '../../src/features/repository-context/infrastructure/knowledge/sqlite/SqliteRepositoryKnowledgeStore';
import { evaluateKnownPaths, loadKnownPathCases } from './knownPathsEval';
import { outputHarnessResult } from './commandRunner';
import type { RepositoryEvalResult } from './types';

function buildRepositoryIndexFromSession(session: ReturnType<typeof createAnalysisSession>, workspaceRoot: string) {
  const rootFiles = session.program.getRootFileNames();
  return {
    metadata: { workspaceId: 'codeprep', schemaVersion: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    entries: rootFiles
      .map(f => path.relative(workspaceRoot, f).replace(/\\/g, '/'))
      .filter(rel => !rel.startsWith('node_modules') && !rel.startsWith('..'))
      .map(relativePath => ({
        projectId: 'codeprep',
        relativePath,
        kind: 'code' as const,
        size: 100,
        contentHash: 'eval-hash',
      })),
  };
}

async function extractRelations(workspaceRoot: string) {
  const t0 = Date.now();
  const session = createAnalysisSession(workspaceRoot);
  const sessionSetupMs = Date.now() - t0;

  const tLang = Date.now();
  const langResult = await new TypeScriptLanguageAdapter(session).analyze({ workspaceRoot });
  const languageAnalysisMs = Date.now() - tLang;

  const tWire = Date.now();
  const wiringResult = await new TypeScriptWiringAdapter(session).analyze({ workspaceRoot });
  const wiringAnalysisMs = Date.now() - tWire;
  const repositoryIndex = buildRepositoryIndexFromSession(session, workspaceRoot);

  return { langResult, wiringResult, repositoryIndex, timings: { sessionSetupMs, languageAnalysisMs, wiringAnalysisMs, t0 } };
}

async function persistKnowledge(
  store: SqliteRepositoryKnowledgeStore,
  snapshot: ReturnType<typeof createRepositorySnapshot>,
  extracted: Awaited<ReturnType<typeof extractRelations>>,
) {
  const tSave = Date.now();
  const buildResult = await new BuildRepositoryKnowledgeUseCase().execute({
    snapshot,
    repositoryIndex: extracted.repositoryIndex,
    languageRelations: extracted.langResult.relations,
    wiringRelations: extracted.wiringResult.relations,
    store,
  });
  return { buildResult, saveMs: Date.now() - tSave };
}

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

async function persistAndMeasureStore(
  workspaceRoot: string,
  dbPath: string,
  extracted: Awaited<ReturnType<typeof extractRelations>>,
) {
  const store = new SqliteRepositoryKnowledgeStore({ workspaceRoot, dbPath });
  const snapshot = createRepositorySnapshot({
    snapshotId: `eval-${Date.now()}`, repositoryId: 'codeprep-repo',
    workspaceRoot, revision: 'eval-head', createdAt: new Date().toISOString(),
  });
  const { buildResult, saveMs } = await persistKnowledge(store, snapshot, extracted);
  const sampleNode = Array.from(buildResult.ir.nodes.values())[0];
  const { loadMs, neighborQueryMs, stats } = await measureStoreQueries(store, snapshot.snapshotId, sampleNode?.id);

  return {
    snapshot, repositoryIndex: extracted.repositoryIndex, buildResult, stats,
    timings: {
      sessionSetupMs: extracted.timings.sessionSetupMs,
      languageAnalysisMs: extracted.timings.languageAnalysisMs,
      wiringAnalysisMs: extracted.timings.wiringAnalysisMs,
      saveMs, loadMs, neighborQueryMs,
      totalMs: Date.now() - extracted.timings.t0,
    },
  };
}

async function runExtractionAndBuild(workspaceRoot: string, dbPath: string) {
  const extracted = await extractRelations(workspaceRoot);
  return persistAndMeasureStore(workspaceRoot, dbPath, extracted);
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
}

export async function executeRepositoryEval(phase = 'current', format: 'text' | 'json' = 'text'): Promise<RepositoryEvalResult> {
  const workspaceRoot = process.cwd();
  const memStart = process.memoryUsage().heapUsed;
  const dbPath = path.join(workspaceRoot, '.codeprep', 'repository-knowledge.db');

  const { snapshot, repositoryIndex, buildResult, stats, timings } = await runExtractionAndBuild(workspaceRoot, dbPath);
  const knownCases = loadKnownPathCases();
  const knownPaths = await evaluateKnownPaths(knownCases, dbPath);

  const relations: Record<string, number> = {};
  for (const edge of buildResult.ir.edges) relations[edge.relationType] = (relations[edge.relationType] ?? 0) + 1;

  const memEnd = process.memoryUsage().heapUsed;
  const result: RepositoryEvalResult = {
    snapshotId: snapshot.snapshotId,
    files: repositoryIndex.entries.length,
    nodes: stats.nodeCount,
    edges: stats.edgeCount,
    evidence: stats.evidenceCount,
    relations: Object.freeze(relations),
    knownPaths,
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

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { KnownPathCase, KnownPathsEvalResult } from './types';
import { createSqliteConnection } from '../../src/features/repository-context/infrastructure/knowledge/sqlite/SqliteConnectionFactory';
import { SqliteRepositoryKnowledgeStore } from '../../src/features/repository-context/infrastructure/knowledge/sqlite/SqliteRepositoryKnowledgeStore';

export function loadKnownPathCases(filePath?: string): readonly KnownPathCase[] {
  const targetPath = filePath ?? path.resolve(process.cwd(), 'evaluation/repository-known-paths.json');
  if (!fs.existsSync(targetPath)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
    return Array.isArray(data.cases) ? data.cases : [];
  } catch {
    return [];
  }
}

async function verifyCaseAgainstStore(
  c: KnownPathCase,
  store: SqliteRepositoryKnowledgeStore,
  snapshotId: string
): Promise<string | undefined> {
  const ir = await store.load(snapshotId);
  if (!ir) return 'Snapshot not found in Knowledge Store';

  const relLower = c.relation.toLowerCase();
  const matched = ir.edges.some(edge => {
    if (edge.relationType !== relLower) return false;
    const srcNode = ir.nodes.get(edge.sourceNodeId);
    const tgtNode = ir.nodes.get(edge.targetNodeId);
    const srcMatch = srcNode?.name === c.source || srcNode?.path?.includes(c.source);
    const tgtMatch = tgtNode?.name === c.target || tgtNode?.path?.includes(c.target);
    return srcMatch && tgtMatch;
  });

  return matched ? undefined : `Relation ${c.source} --[${c.relation}]--> ${c.target} not found`;
}

async function evaluateAllCases(cases: readonly KnownPathCase[], store: SqliteRepositoryKnowledgeStore, snapshotId: string) {
  let passed = 0;
  let failed = 0;
  const failures: { id: string; reason: string }[] = [];
  for (const c of cases) {
    const error = await verifyCaseAgainstStore(c, store, snapshotId);
    if (!error) {
      passed++;
    } else {
      failed++;
      failures.push({ id: c.id, reason: error });
    }
  }
  return { passed, failed, total: cases.length, failures: Object.freeze(failures) };
}

function buildEmptyFailure(cases: readonly KnownPathCase[], reason: string): KnownPathsEvalResult {
  return {
    passed: 0,
    failed: cases.length,
    total: cases.length,
    failures: cases.map(c => ({ id: c.id, reason })),
  };
}

export async function evaluateKnownPaths(
  cases: readonly KnownPathCase[],
  dbPath?: string
): Promise<KnownPathsEvalResult> {
  const resolvedDb = dbPath ?? path.resolve(process.cwd(), '.codeprep/repository-knowledge.db');
  if (!fs.existsSync(resolvedDb)) {
    return buildEmptyFailure(cases, 'Database file not found (.codeprep/repository-knowledge.db)');
  }

  const driver = createSqliteConnection(resolvedDb);
  const store = new SqliteRepositoryKnowledgeStore({ workspaceRoot: process.cwd(), driver });
  const latest = await store.findLatest('codeprep-repo');
  if (!latest) {
    await store.close();
    return buildEmptyFailure(cases, 'No latest snapshot found in database');
  }

  const result = await evaluateAllCases(cases, store, latest.snapshotId);
  await store.close();
  return result;
}

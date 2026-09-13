import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { afterAll, describe, expect, it } from 'vitest';
import { createRepositorySnapshot, type RepositoryEdge } from '../../../../domain/ir';
import { BuildRepositoryKnowledgeUseCase } from '../../../../application/ir/usecases/BuildRepositoryKnowledgeUseCase';
import { createAnalysisSession } from '../../../language/typescript/TypeScriptAnalysisSession';
import { TypeScriptLanguageAdapter } from '../../../language/typescript/TypeScriptLanguageAdapter';
import { TypeScriptWiringAdapter } from '../../../composition/typescript/TypeScriptWiringAdapter';
import { DependencyScanner } from '../../../../../engine/application/DependencyScanner';
import { SqliteRepositoryKnowledgeStore } from '../SqliteRepositoryKnowledgeStore';
import type { DocGraphRelationPair, FileDependencyPair, GitCoChangeRelation } from '../../../../application/ir/mappers';

function collectFiles(workspaceRoot: string, session: ReturnType<typeof createAnalysisSession>) {
  const rootFiles = session.program.getRootFileNames();
  const fileEntries = rootFiles
    .map(f => path.relative(workspaceRoot, f).replace(/\\/g, '/'))
    .filter(rel => !rel.startsWith('node_modules') && !rel.startsWith('..'))
    .map(relativePath => ({
      projectId: 'codeprep', relativePath, kind: 'code' as const, size: 100, contentHash: 'smoke-hash',
    }));
  return fileEntries;
}

function scanMarkdownFiles(dir: string, workspaceRoot: string): string[] {
  const mdFiles: string[] = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, item.name);
    if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules' && item.name !== 'out') {
      mdFiles.push(...scanMarkdownFiles(p, workspaceRoot));
    } else if (item.isFile() && item.name.endsWith('.md')) {
      mdFiles.push(path.relative(workspaceRoot, p).replace(/\\/g, '/'));
    }
  }
  return mdFiles;
}

async function extractDependencies(workspaceRoot: string, fileEntries: { relativePath: string }[], fileSet: Set<string>) {
  const scanner = new DependencyScanner();
  const dependencies: FileDependencyPair[] = [];
  for (const entry of fileEntries) {
    const fullPath = path.join(workspaceRoot, entry.relativePath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');
    const rawDeps = await scanner.findDependencies(entry.relativePath, content, workspaceRoot);
    for (const raw of rawDeps) {
      const candidates = [raw, `${raw}.ts`, `${raw}.tsx`, `${raw}/index.ts`];
      const target = candidates.find(c => fileSet.has(c));
      if (target) dependencies.push({ fromPath: entry.relativePath, toPath: target });
    }
  }
  return dependencies;
}

function extractGitCoChanges(workspaceRoot: string, fileSet: Set<string>): GitCoChangeRelation[] {
  const gitCoChanges: GitCoChangeRelation[] = [];
  try {
    const logOutput = execSync('git log -n 50 --name-only --format="commit:%H"', { cwd: workspaceRoot, encoding: 'utf8' });
    const commits = logOutput.split('commit:').filter(Boolean);
    const pairCounts = new Map<string, number>();
    for (const commit of commits) {
      const files = commit.split(/\r?\n/).map(f => f.trim().replace(/\\/g, '/')).filter(f => fileSet.has(f));
      for (let i = 0; i < files.length; i++) {
        for (let j = i + 1; j < files.length; j++) {
          const key = `${files[i]}|${files[j]}`;
          pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
        }
      }
    }
    for (const [key, count] of pairCounts.entries()) {
      const [fromPath, toPath] = key.split('|');
      gitCoChanges.push({ fromPath, toPath, count });
    }
  } catch {
    // git history unavailable fallback
  }
  return gitCoChanges;
}

function extractDocRelations(workspaceRoot: string, mdFiles: string[], allFileSet: Set<string>): DocGraphRelationPair[] {
  const docGraphRelations: DocGraphRelationPair[] = [];
  for (const doc of mdFiles) {
    const full = path.join(workspaceRoot, doc);
    const text = fs.readFileSync(full, 'utf8');
    const matches = text.match(/\[[^\]]+\]\(([^)]+)\)/g) ?? [];
    for (const m of matches) {
      const href = m.match(/\(([^)]+)\)/)?.[1];
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) continue;
      const cleanHref = href.split('#')[0].replace(/^file:\/\/\/?/, '').replace(/^[A-Za-z]:\//, '').replace(/\\/g, '/');
      const docDir = path.dirname(doc);
      const candidates = [
        path.relative(workspaceRoot, path.resolve(workspaceRoot, docDir, cleanHref)).replace(/\\/g, '/'),
        path.relative(workspaceRoot, path.resolve(workspaceRoot, cleanHref)).replace(/\\/g, '/'),
      ];
      const match = candidates.find(cand => allFileSet.has(cand) && cand !== doc);
      if (match) docGraphRelations.push({ fromPath: doc, toPath: match, reason: 'markdown-link', confidence: 0.9 });
    }
  }
  return docGraphRelations;
}

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

  it('verifies zero relation-loss persistence across all 8 production relation types', async () => {
    const session = createAnalysisSession(workspaceRoot);
    const langResult = await new TypeScriptLanguageAdapter(session).analyze({ workspaceRoot });
    const wiringResult = await new TypeScriptWiringAdapter(session).analyze({ workspaceRoot });

    const fileEntries = collectFiles(workspaceRoot, session);
    const mdFiles = scanMarkdownFiles(workspaceRoot, workspaceRoot);
    const docEntries = mdFiles.map(d => ({
      projectId: 'codeprep', relativePath: d, kind: 'document' as const, size: 100, contentHash: 'dh',
    }));
    const allFileEntries = [...fileEntries, ...docEntries];
    const allFileSet = new Set(allFileEntries.map(e => e.relativePath));
    const codeFileSet = new Set(fileEntries.map(e => e.relativePath));

    const dependencies = await extractDependencies(workspaceRoot, fileEntries, codeFileSet);
    const gitCoChanges = extractGitCoChanges(workspaceRoot, codeFileSet);
    const docGraphRelations = extractDocRelations(workspaceRoot, mdFiles, allFileSet);

    const snapshot = createRepositorySnapshot({
      snapshotId: 'prod-smoke-full', repositoryId: 'codeprep-repo',
      workspaceRoot, revision: 'prod-head', createdAt: new Date().toISOString(),
    });

    store = new SqliteRepositoryKnowledgeStore({ workspaceRoot, dbPath: tempDbPath });
    const buildResult = await new BuildRepositoryKnowledgeUseCase().execute({
      snapshot,
      repositoryIndex: {
        metadata: { workspaceId: 'codeprep', schemaVersion: 1, createdAt: '', updatedAt: '' },
        entries: allFileEntries,
      },
      languageRelations: langResult.relations,
      wiringRelations: wiringResult.relations,
      dependencies,
      gitCoChanges,
      docGraphRelations,
      store,
    });

    const beforeCounts = countRelations(buildResult.ir.edges);
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

    expect(loadedIr!.edges.length).toBe(buildResult.ir.edges.length);
    expect(loadedIr!.nodes.size).toBe(buildResult.ir.nodes.size);
  }, 90000);
});

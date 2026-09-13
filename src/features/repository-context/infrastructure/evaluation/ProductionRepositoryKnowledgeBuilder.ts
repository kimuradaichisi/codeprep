import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import {
  createRepositorySnapshot,
  type RepositoryEdge,
  type RepositoryIR,
  type RepositoryNode,
  type RepositorySnapshot,
} from '../../domain/ir';
import { BuildRepositoryIRUseCase } from '../../application/ir/BuildRepositoryIRUseCase';
import type { DocGraphRelationPair, FileDependencyPair, GitCoChangeRelation } from '../../application/ir/mappers';
import { DependencyScanner } from '../../../engine/application/DependencyScanner';
import { createAnalysisSession, type TypeScriptAnalysisSession } from '../language/typescript/TypeScriptAnalysisSession';
import { TypeScriptLanguageAdapter } from '../language/typescript/TypeScriptLanguageAdapter';
import { TypeScriptWiringAdapter } from '../composition/typescript/TypeScriptWiringAdapter';

export interface ProductionExtractResult {
  readonly ir: RepositoryIR;
  readonly session: TypeScriptAnalysisSession;
  readonly fileEntries: readonly { relativePath: string; kind: 'code' | 'document'; size: number; contentHash: string; projectId: string }[];
  readonly durationMs: {
    languageMs: number;
    wiringMs: number;
    dependencyMs: number;
    gitCoChangeMs: number;
    docGraphMs: number;
    totalMs: number;
  };
}

function scanMarkdownFiles(dir: string, workspaceRoot: string): string[] {
  const mdFiles: string[] = [];
  if (!fs.existsSync(dir)) return mdFiles;
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

export function collectAllFileEntries(workspaceRoot: string, session: TypeScriptAnalysisSession) {
  const rootFiles = session.program.getRootFileNames();
  const codeEntries = rootFiles
    .map(f => path.relative(workspaceRoot, f).replace(/\\/g, '/'))
    .filter(rel => !rel.startsWith('node_modules') && !rel.startsWith('..'))
    .map(relativePath => ({
      projectId: 'codeprep', relativePath, kind: 'code' as const, size: 100, contentHash: 'eval-hash',
    }));

  const mdFiles = scanMarkdownFiles(workspaceRoot, workspaceRoot);
  const docEntries = mdFiles.map(d => ({
    projectId: 'codeprep', relativePath: d, kind: 'document' as const, size: 100, contentHash: 'eval-hash',
  }));

  return Object.freeze([...codeEntries, ...docEntries]);
}

export async function extractDependencies(
  workspaceRoot: string,
  fileEntries: readonly { relativePath: string }[],
  targetPaths?: Set<string>,
): Promise<FileDependencyPair[]> {
  const scanner = new DependencyScanner();
  const fileSet = new Set(fileEntries.map(e => e.relativePath));
  const dependencies: FileDependencyPair[] = [];

  for (const entry of fileEntries) {
    if (targetPaths && !targetPaths.has(entry.relativePath)) continue;
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

export function extractGitCoChanges(workspaceRoot: string, codeFileSet: Set<string>): GitCoChangeRelation[] {
  const gitCoChanges: GitCoChangeRelation[] = [];
  try {
    const logOutput = execSync('git log -n 50 --name-only --format="commit:%H"', { cwd: workspaceRoot, encoding: 'utf8' });
    const commits = logOutput.split('commit:').filter(Boolean);
    const pairCounts = new Map<string, number>();
    for (const commit of commits) {
      const files = commit.split(/\r?\n/).map(f => f.trim().replace(/\\/g, '/')).filter(f => codeFileSet.has(f));
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

export function extractDocRelations(workspaceRoot: string, allFileSet: Set<string>, targetPaths?: Set<string>): DocGraphRelationPair[] {
  const mdFiles = scanMarkdownFiles(workspaceRoot, workspaceRoot);
  const docGraphRelations: DocGraphRelationPair[] = [];

  for (const doc of mdFiles) {
    if (targetPaths && !targetPaths.has(doc)) continue;
    const full = path.join(workspaceRoot, doc);
    if (!fs.existsSync(full)) continue;
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

async function extractProducersData(workspaceRoot: string, session: TypeScriptAnalysisSession, fileEntries: readonly { relativePath: string; kind: 'code' | 'document' }[]) {
  const allFileSet = new Set(fileEntries.map(e => e.relativePath));
  const codeFileSet = new Set(fileEntries.filter(e => e.kind === 'code').map(e => e.relativePath));

  const tLang = Date.now();
  const langResult = await new TypeScriptLanguageAdapter(session).analyze({ workspaceRoot });
  const languageMs = Date.now() - tLang;

  const tWire = Date.now();
  const wiringResult = await new TypeScriptWiringAdapter(session).analyze({ workspaceRoot });
  const wiringMs = Date.now() - tWire;

  const tDep = Date.now();
  const dependencies = await extractDependencies(workspaceRoot, fileEntries);
  const dependencyMs = Date.now() - tDep;

  const tGit = Date.now();
  const gitCoChanges = extractGitCoChanges(workspaceRoot, codeFileSet);
  const gitCoChangeMs = Date.now() - tGit;

  const tDoc = Date.now();
  const docGraphRelations = extractDocRelations(workspaceRoot, allFileSet);
  const docGraphMs = Date.now() - tDoc;

  return { langResult, wiringResult, dependencies, gitCoChanges, docGraphRelations, durations: { languageMs, wiringMs, dependencyMs, gitCoChangeMs, docGraphMs } };
}

export class ProductionRepositoryKnowledgeBuilder {
  public async buildFullIR(workspaceRoot: string, snapshot: RepositorySnapshot): Promise<ProductionExtractResult> {
    const t0 = Date.now();
    const session = createAnalysisSession(workspaceRoot);
    const fileEntries = collectAllFileEntries(workspaceRoot, session);
    const data = await extractProducersData(workspaceRoot, session, fileEntries);

    const useCase = new BuildRepositoryIRUseCase();
    const ir = useCase.execute({
      snapshot,
      repositoryIndex: {
        metadata: { workspaceId: 'codeprep', schemaVersion: 1, createdAt: '', updatedAt: '' },
        entries: fileEntries,
      },
      languageRelations: data.langResult.relations,
      wiringRelations: data.wiringResult.relations,
      dependencies: data.dependencies,
      gitCoChanges: data.gitCoChanges,
      docGraphRelations: data.docGraphRelations,
    });

    return Object.freeze({
      ir, session, fileEntries,
      durationMs: { ...data.durations, totalMs: Date.now() - t0 },
    });
  }
}

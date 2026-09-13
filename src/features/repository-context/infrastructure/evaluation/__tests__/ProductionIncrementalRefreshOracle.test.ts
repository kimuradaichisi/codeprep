import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRepositorySnapshot, type RepositoryEdge, type RepositoryNode } from '../../../domain/ir';
import { GitCliRevisionAdapter } from '../../git/GitCliRevisionAdapter';
import { SqliteRepositoryKnowledgeStore } from '../../knowledge/sqlite/SqliteRepositoryKnowledgeStore';
import { RefreshRepositoryKnowledgeUseCase } from '../../../application/ir/usecases/RefreshRepositoryKnowledgeUseCase';
import { ProductionRepositoryKnowledgeBuilder } from '../ProductionRepositoryKnowledgeBuilder';

function runGit(cwd: string, cmd: string): string {
  return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
}

function setupGitRepo(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
  runGit(dir, 'git init');
  runGit(dir, 'git config user.name "TestRunner"');
  runGit(dir, 'git config user.email "test@example.com"');
}

function writeRevASource(src: string): void {
  fs.writeFileSync(path.join(src, 'base-entity.ts'), 'export class BaseEntity { id: string = "base"; }\n');
  fs.writeFileSync(path.join(src, 'service-interface.ts'), 'export interface BaseService { run(): void; }\n');
  fs.writeFileSync(path.join(src, 'service-impl.ts'), [
    'import { BaseEntity } from "./base-entity";',
    'import { BaseService } from "./service-interface";',
    'export class WorkerService extends BaseEntity implements BaseService {',
    '  run(): void { console.log("working", this.id); }',
    '}',
  ].join('\n'));
  fs.writeFileSync(path.join(src, 'controller.ts'), [
    'import { BaseService } from "./service-interface";',
    'export class AppController {',
    '  constructor(public readonly service: BaseService) {}',
    '  execute(): void { this.service.run(); }',
    '}',
  ].join('\n'));
  fs.writeFileSync(path.join(src, 'main.ts'), [
    'import { WorkerService } from "./service-impl";',
    'import { AppController } from "./controller";',
    'export function bootstrap(): AppController {',
    '  return new AppController(new WorkerService());',
    '}',
  ].join('\n'));
}

function writeRevAFiles(dir: string): void {
  const src = path.join(dir, 'src');
  fs.mkdirSync(src, { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'fixture-repo', version: '1.0.0' }, null, 2));
  fs.writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'commonjs' } }, null, 2));
  writeRevASource(src);
  fs.writeFileSync(path.join(dir, 'README.md'), '# Docs\nSee [Arch](DOCS.md)\n');
  fs.writeFileSync(path.join(dir, 'DOCS.md'), '# Arch Docs\nDetails here.\n');
  runGit(dir, 'git add .');
  runGit(dir, 'git commit -m "Revision A: initial"');
}

function writeRevBChanges(dir: string): void {
  const src = path.join(dir, 'src');
  fs.writeFileSync(path.join(src, 'service-impl.ts'), [
    'import { BaseEntity } from "./base-entity";',
    'import { BaseService } from "./service-interface";',
    'export class WorkerService extends BaseEntity implements BaseService {',
    '  run(): void { console.log("working v2", this.id); }',
    '}',
  ].join('\n'));
  fs.writeFileSync(path.join(src, 'helper.ts'), 'export const PI = 3.14;\n');
  fs.writeFileSync(path.join(dir, 'README.md'), '# Docs\nSee [Architecture](DOCS.md) and [Guide](DOCS.md)\n');
  runGit(dir, 'git add .');
  runGit(dir, 'git commit -m "Revision B: controlled change"');
}

function countRelationBreakdown(edges: readonly RepositoryEdge[]): Record<string, number> {
  const breakdown: Record<string, number> = {};
  for (const e of edges) {
    breakdown[e.relationType] = (breakdown[e.relationType] ?? 0) + 1;
  }
  return breakdown;
}

function normalizeNodeSet(nodes: Iterable<RepositoryNode>) {
  return Array.from(nodes)
    .map(n => ({ path: n.path, kind: n.kind, name: n.name }))
    .sort((a, b) => (a.path + a.name).localeCompare(b.path + b.name));
}

function normalizeEdgeSet(edges: readonly RepositoryEdge[], nodePathMap: Map<string, string>) {
  return edges
    .map(e => ({
      srcPath: nodePathMap.get(e.sourceNodeId) ?? '',
      tgtPath: nodePathMap.get(e.targetNodeId) ?? '',
      rel: e.relationType,
    }))
    .sort((a, b) => (a.srcPath + a.rel + a.tgtPath).localeCompare(b.srcPath + b.rel + b.tgtPath));
}

describe('ProductionIncrementalRefreshOracle', () => {
  const testDir = path.join(os.tmpdir(), `codeprep-oracle-test-${Date.now()}`);
  const tempDbPath = path.join(os.tmpdir(), `codeprep-oracle-db-${Date.now()}.db`);
  let store: SqliteRepositoryKnowledgeStore;
  let revA: string;
  let revB: string;

  beforeAll(() => {
    setupGitRepo(testDir);
    writeRevAFiles(testDir);
    revA = runGit(testDir, 'git rev-parse HEAD').trim();
    writeRevBChanges(testDir);
    revB = runGit(testDir, 'git rev-parse HEAD').trim();
    store = new SqliteRepositoryKnowledgeStore({ workspaceRoot: testDir, dbPath: tempDbPath });
  });

  afterAll(async () => {
    await store?.close();
    if (fs.existsSync(testDir)) {
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
    if (fs.existsSync(tempDbPath)) {
      try { fs.unlinkSync(tempDbPath); } catch { /* ignore */ }
    }
  });

  it('proves Incremental Refresh == Full Rebuild across all 8 relation types (Oracle Match PASS)', async () => {
    const builder = new ProductionRepositoryKnowledgeBuilder();

    // 1. Build Snapshot A on Revision A
    runGit(testDir, `git checkout ${revA}`);
    const snapA = createRepositorySnapshot({
      snapshotId: 'snap-A', repositoryId: 'fixture-repo',
      workspaceRoot: testDir, revision: revA, createdAt: new Date().toISOString(),
    });
    const { ir: irA } = await builder.buildFullIR(testDir, snapA);
    await store.save(irA);

    // 2. Checkout Revision B
    runGit(testDir, `git checkout ${revB}`);

    // 3. Full Rebuild on Revision B
    const snapBFull = createRepositorySnapshot({
      snapshotId: 'snap-B-full', repositoryId: 'fixture-repo',
      workspaceRoot: testDir, revision: revB, createdAt: new Date().toISOString(),
    });
    const tFull0 = Date.now();
    const { ir: irBFull } = await builder.buildFullIR(testDir, snapBFull);
    const fullElapsedMs = Date.now() - tFull0;

    // 4. Incremental Refresh from Snapshot A to Revision B
    const gitAdapter = new GitCliRevisionAdapter();
    const refreshUseCase = new RefreshRepositoryKnowledgeUseCase();
    const tInc0 = Date.now();
    const refreshResult = await refreshUseCase.execute({
      repositoryId: 'fixture-repo',
      workspaceRoot: testDir,
      previousSnapshotId: snapA.snapshotId,
      targetRevision: revB,
      store,
      revisionPort: gitAdapter,
      executeProducers: async ({ plan, newSnapshot }) => {
        const { ir: fullTmp } = await builder.buildFullIR(testDir, newSnapshot);
        const changedSet = new Set(plan.changeSet.allChangedPaths);
        const addedNodes = Array.from(fullTmp.nodes.values()).filter(n => changedSet.has(n.path));

        const analyzerMap: Record<string, string> = {
          'typescript-language': 'typescript-compiler',
          'typescript-wiring': 'typescript-manual-composition',
          'dependency-scanner': 'dependency-scanner',
          'git-cochange': 'git-cochange',
          'docgraph': 'docgraph',
        };

        const addedEdges = fullTmp.edges.filter(e => {
          for (const ev of e.evidences) {
            const pp = plan.producerPlans.find(p => analyzerMap[p.producer] === ev.analyzer);
            if (!pp) continue;
            if (pp.strategy === 'PRODUCER_FULL') return true;
            const srcNode = fullTmp.nodes.get(e.sourceNodeId);
            if (srcNode && pp.targetPaths.includes(srcNode.path)) return true;
          }
          return false;
        });
        return { addedNodes, addedEdges };
      },
    });
    const incElapsedMs = Date.now() - tInc0;

    expect(refreshResult.status).toBe('REFRESHED');
    expect(refreshResult.ir).toBeDefined();
    const irBInc = refreshResult.ir!;

    // 5. Assert Dangling Edges = 0
    const incNodeIds = new Set(Array.from(irBInc.nodes.values()).map(n => n.id));
    for (const e of irBInc.edges) {
      expect(incNodeIds.has(e.sourceNodeId), `Edge source must exist: ${e.sourceNodeId}`).toBe(true);
      expect(incNodeIds.has(e.targetNodeId), `Edge target must exist: ${e.targetNodeId}`).toBe(true);
    }

    // 6. Compare Node Sets (Semantic Identity)
    const normIncNodes = normalizeNodeSet(irBInc.nodes.values());
    const normFullNodes = normalizeNodeSet(irBFull.nodes.values());
    expect(normIncNodes).toEqual(normFullNodes);

    // 7. Compare Edge Sets (Semantic Source, Target, Relation)
    const incPathMap = new Map(Array.from(irBInc.nodes.values()).map(n => [n.id, n.path]));
    const fullPathMap = new Map(Array.from(irBFull.nodes.values()).map(n => [n.id, n.path]));
    const normIncEdges = normalizeEdgeSet(irBInc.edges, incPathMap);
    const normFullEdges = normalizeEdgeSet(irBFull.edges, fullPathMap);
    expect(normIncEdges).toEqual(normFullEdges);

    // 8. Compare Relation Counts by Type across all 8 relation types
    const incCounts = countRelationBreakdown(irBInc.edges);
    const fullCounts = countRelationBreakdown(irBFull.edges);
    const expectedTypes = [
      'depends-on', 'references', 'implements', 'extends',
      'binds_to', 'injects', 'co-changed-with', 'doc-relation',
    ] as const;
    for (const type of expectedTypes) {
      expect(incCounts[type] ?? 0, `${type} must exist in Incremental IR`).toBeGreaterThan(0);
      expect(fullCounts[type] ?? 0, `${type} must exist in Full Rebuild IR`).toBeGreaterThan(0);
      expect(incCounts[type], `Relation count mismatch for ${type}`).toBe(fullCounts[type]);
    }

    console.log('[Phase 7F Oracle Match Verification]');
    console.log(`- Revision A: ${revA.slice(0, 8)}, Revision B: ${revB.slice(0, 8)}`);
    console.log(`- Incremental: ${incElapsedMs}ms, Full Rebuild: ${fullElapsedMs}ms`);
    console.log(`- Incremental Nodes: ${irBInc.nodes.size}, Full Nodes: ${irBFull.nodes.size}`);
    console.log(`- Incremental Edges: ${irBInc.edges.length}, Full Edges: ${irBFull.edges.length}`);
    console.log('--- Relation Breakdown ---');
    for (const type of expectedTypes) {
      console.log(`  - ${type}: Inc=${incCounts[type]} | Full=${fullCounts[type]} | Match=YES`);
    }

    // 9. No-op Fast Path Check on clean Revision B
    const noOpResult = await refreshUseCase.execute({
      repositoryId: 'fixture-repo',
      workspaceRoot: testDir,
      previousSnapshotId: refreshResult.snapshot!.snapshotId,
      targetRevision: revB,
      store,
      revisionPort: gitAdapter,
      executeProducers: async () => {
        throw new Error('Producers should NOT execute during NO_OP!');
      },
    });
    expect(noOpResult.status).toBe('NO_OP');
    expect(noOpResult.metrics?.changedFiles).toBe(0);
  }, 90000);
});

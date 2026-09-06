import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Project } from '../domain/Project';
import { BuildSemanticIndexUseCase } from '../application/BuildSemanticIndexUseCase';
import { DiscoverEntryPointCandidatesUseCase } from '../application/DiscoverEntryPointCandidatesUseCase';
import { SemanticEntryPointCandidateSource } from '../application/SemanticEntryPointCandidateSource';
import { SemanticSearchUseCase } from '../application/SemanticSearchUseCase';
import { FakeEmbeddingPort } from '../infrastructure/embedding/FakeEmbeddingPort';
import { HttpEmbeddingAdapter } from '../infrastructure/embedding/HttpEmbeddingAdapter';
import { JsonSemanticIndexStore } from '../infrastructure/filesystem/JsonSemanticIndexStore';
import { ProjectRegistryStore } from '../infrastructure/filesystem/ProjectRegistryStore';
import { listProjectFiles } from '../infrastructure/filesystem/ProjectFileTree';
import type { ProjectFilePort } from '../application/ports';
import { evaluateCandidates } from './GoldenSetEvaluator';
import { GOLDEN_SET_TASKS } from './goldenSetData';
import { startMockEmbeddingServer } from './MockEmbeddingServer';
import { buildKnowledgeIndex, populateRepository } from './SemanticTestWorkspace';

describe('Semantic Entry Point Candidate Discovery E2E & Evaluation', () => {
  let tempRoot: string;
  let repoRoot: string;
  let storeDir: string;
  let project: Project;
  let registry: ProjectRegistryStore;

  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'codeprep-semantic-e2e-'));
    repoRoot = join(tempRoot, 'repo');
    storeDir = join(tempRoot, 'indexes');
    project = { id: 'test-project', name: 'TestRepo', rootPath: repoRoot, excludePatterns: [] };
    await populateRepository(repoRoot);

    registry = new ProjectRegistryStore(join(tempRoot, 'registry.json'));
    await registry.saveAll([project]);
  });

  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  it('discovers OrderService and refund.md via semanticMatch for duplicate refund task', async () => {
    const knowledgeIndex = await buildKnowledgeIndex(repoRoot, storeDir, project);
    const embeddingPort = new FakeEmbeddingPort({ dimensions: 16 });
    const semanticStore = new JsonSemanticIndexStore(storeDir);
    const buildSemanticUseCase = new BuildSemanticIndexUseCase(embeddingPort, semanticStore);
    await buildSemanticUseCase.execute(knowledgeIndex);

    const searchUseCase = new SemanticSearchUseCase(embeddingPort, semanticStore);
    const semanticSource = new SemanticEntryPointCandidateSource(searchUseCase, project.id, { minScore: 0.2 });

    const filesPort: ProjectFilePort = {
      list: async (p) => (await listProjectFiles(p.rootPath, false)).map((rel) => ({ relativePath: rel, size: 100 })),
    };

    const ports = {
      projects: registry,
      files: filesPort,
      customSources: [semanticSource],
    };
    const useCase = new DiscoverEntryPointCandidatesUseCase(ports);

    const res = await useCase.execute({
      task: '返品時の二重返金を調査する duplicate refund',
      projectIds: [project.id],
      maxCandidates: 10,
    });

    const paths = res.candidates.map((c) => c.relativePath);
    expect(paths).toContain('src/order/OrderService.ts');
    expect(paths).toContain('docs/order/refund.md');

    const orderCandidate = res.candidates.find((c) => c.relativePath === 'src/order/OrderService.ts');
    expect(orderCandidate?.reasons).toContain('semanticMatch');
  });

  it('benchmarks Golden Set: compares deterministic-only baseline vs deterministic + real semantic', async () => {
    const mockServer = await startMockEmbeddingServer(16);
    try {
      const knowledgeIndex = await buildKnowledgeIndex(repoRoot, storeDir, project);
      const embeddingPort = new HttpEmbeddingAdapter({
        endpoint: mockServer.endpoint,
        dimensions: 16,
      });
      const semanticStore = new JsonSemanticIndexStore(storeDir);
      await new BuildSemanticIndexUseCase(embeddingPort, semanticStore).execute(knowledgeIndex);

      const searchUseCase = new SemanticSearchUseCase(embeddingPort, semanticStore);
      const semanticSource = new SemanticEntryPointCandidateSource(searchUseCase, project.id, { minScore: 0.2 });

      const filesPort: ProjectFilePort = {
        list: async (p) => (await listProjectFiles(p.rootPath, false)).map((rel) => ({ relativePath: rel, size: 100 })),
      };

      const deterministicUseCase = new DiscoverEntryPointCandidatesUseCase({ projects: registry, files: filesPort });
      const hybridUseCase = new DiscoverEntryPointCandidatesUseCase({
        projects: registry,
        files: filesPort,
        customSources: [semanticSource],
      });

      const detResults = [];
      const hybridResults = [];
      for (const item of GOLDEN_SET_TASKS) {
        const d = await deterministicUseCase.execute({ task: item.task, projectIds: [project.id] });
        const h = await hybridUseCase.execute({ task: item.task, projectIds: [project.id] });
        detResults.push(d.candidates);
        hybridResults.push(h.candidates);
      }

      const detMetrics = evaluateCandidates(GOLDEN_SET_TASKS, detResults);
      const hybridMetrics = evaluateCandidates(GOLDEN_SET_TASKS, hybridResults);

      console.log('--- Golden Set Evaluation (Real HttpEmbeddingAdapter) ---');
      console.log('Deterministic Only:', detMetrics);
      console.log('Hybrid (Deterministic + Real Semantic):', hybridMetrics);

      expect(hybridMetrics.recall10Rate).toBeGreaterThanOrEqual(detMetrics.recall10Rate);
      expect(hybridMetrics.top5Rate).toBeGreaterThanOrEqual(detMetrics.top5Rate);
    } finally {
      await new Promise<void>((resolve) => mockServer.server.close(() => resolve()));
    }
  });
});

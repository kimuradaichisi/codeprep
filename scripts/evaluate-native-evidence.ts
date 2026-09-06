// scripts/evaluate-native-evidence.ts
import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import { performance } from 'perf_hooks';
import type { Project } from '../src/features/repository-context/domain/Project';
import type { EntryPointCandidate } from '../src/features/repository-context/domain/EntryPointCandidate';
import { DiscoverEntryPointCandidatesUseCase } from '../src/features/repository-context/application/DiscoverEntryPointCandidatesUseCase';
import { EnrichEntryPointCandidatesUseCase } from '../src/features/repository-context/application/EnrichEntryPointCandidatesUseCase';
import type { CandidateEvidencePorts } from '../src/features/repository-context/application/candidateEvidencePorts';
import { DependencyScanner } from '../src/features/engine/application/DependencyScanner';
import { DirectoryProximityClient } from '../src/features/repository-context/infrastructure/recommendation/DirectoryProximityClient';
import { MarkdownRecommendationClient } from '../src/features/repository-context/infrastructure/recommendation/MarkdownRecommendationClient';
import { RipgrepClient } from '../src/features/repository-context/infrastructure/search/RipgrepClient';
import { parseGitCoChangeOutput } from '../src/features/repository-context/infrastructure/git/GitCoChangeClient';
import { createRecommendation, type RecommendationRecord } from '../src/features/repository-context/domain/Recommendation';
import type { RecommendationSourcePort } from '../src/features/repository-context/application/ports';
import { SemanticSearchUseCase } from '../src/features/repository-context/application/SemanticSearchUseCase';
import { SemanticEntryPointCandidateSource } from '../src/features/repository-context/application/SemanticEntryPointCandidateSource';
import { JsonSemanticIndexStore } from '../src/features/repository-context/infrastructure/filesystem/JsonSemanticIndexStore';
import { HttpEmbeddingAdapter } from '../src/features/repository-context/infrastructure/embedding/HttpEmbeddingAdapter';
import type { EnrichedEntryPointCandidate } from '../src/features/repository-context/domain/CandidateEvidence';
import { spawnSync } from 'child_process';

interface GoldenTask {
  readonly id: string;
  readonly task: string;
  readonly expectedEntryPoints: readonly string[];
  readonly category: string;
  readonly notes: string;
}

async function collectFiles(dir: string, base = ''): Promise<string[]> {
  const result: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const rel = base ? `${base}/${ent.name}` : ent.name;
    if (ent.isDirectory()) {
      if (!['node_modules', '.git', 'out', 'dist', 'dist-desktop', '.test-store-e2e', '.test-workspace-e2e'].includes(ent.name)) {
        result.push(...(await collectFiles(join(dir, ent.name), rel)));
      }
    } else {
      result.push(rel.replace(/\\/g, '/'));
    }
  }
  return result;
}

class FastCachedGitCoChangeClient implements RecommendationSourcePort {
  constructor(private readonly gitLogOutput: string, private readonly rootPath: string) {}
  async recommend(project: Project, relativePath: string): Promise<readonly RecommendationRecord[]> {
    return parseGitCoChangeOutput(this.gitLogOutput, relativePath, this.rootPath).map((item) => ({
      projectId: project.id,
      relativePath: item.relativePath,
      reason: {
        source: 'gitCoChange',
        score: Math.min(1.0, item.count / 10),
        detail: `Co-changed ${item.count} times`,
      },
    }));
  }
}

async function main() {
  console.log('=== CodePrep Phase 4 Native Evidence Evaluation ===\n');
  const repoRoot = 'D:/git/codeprep';
  const goldenPath = join(repoRoot, 'tests/evaluation/semantic-entry-point-golden.json');
  const tasks: GoldenTask[] = JSON.parse(await readFile(goldenPath, 'utf8'));

  const project: Project = { id: 'codeprep', name: 'codeprep', rootPath: repoRoot, excludePatterns: [] };
  const mockRegistry = {
    getByIds: async () => [project],
    get: async () => project,
    readAll: async () => ({ version: 1, projects: [project] }),
    saveAll: async () => {},
  };

  console.log('1. Scanning files...');
  const allRelFiles = await collectFiles(repoRoot);
  const targetFiles = allRelFiles.filter((f) => f.startsWith('src/') || f.startsWith('apps/') || ['AGENTS.md', 'CHANGELOG.md', 'README.md'].includes(f));
  const fileList = targetFiles.map((rel) => ({ relativePath: rel, size: 100 }));
  const filesPort = { list: async () => fileList };

  const contentPort = {
    canRead: async () => true,
    read: async (p: Project, rel: string) => {
      try {
        return await readFile(join(p.rootPath, rel), 'utf8');
      } catch {
        return '';
      }
    },
  };

  console.log('2. Setting up Semantic & Deterministic Discovery...');
  const semStore = new JsonSemanticIndexStore(join(process.env.APPDATA || '', 'CodePrep', 'semantic-indices'));
  const embeddingPort = new HttpEmbeddingAdapter({
    providerId: 'ollama',
    endpoint: 'http://localhost:11434',
    modelId: 'nomic-embed-text',
    dimensions: 768,
  });
  const semanticSearch = new SemanticSearchUseCase(embeddingPort, semStore);
  const semanticSource = new SemanticEntryPointCandidateSource(semanticSearch, project.id, {
    minScore: 0.65,
    topK: 10,
  });

  const discoveryPorts = {
    projects: mockRegistry as any,
    files: filesPort,
    fileContent: contentPort,
    customSources: [semanticSource],
  };
  const discoveryUseCase = new DiscoverEntryPointCandidatesUseCase(discoveryPorts);

  console.log('3. Preparing cached Git Co-change log...');
  const gitRes = spawnSync('git', ['log', '--name-only', '--pretty=format:commit %H', '-n', '100'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  const gitLog = gitRes.stdout || '';
  const gitClient = new FastCachedGitCoChangeClient(gitLog, repoRoot);

  const evidencePorts: CandidateEvidencePorts = {
    projects: mockRegistry as any,
    files: filesPort,
    fileContent: contentPort,
    dependencyScanner: new DependencyScanner(),
    recommendations: {
      gitCoChange: gitClient,
      directoryProximity: new DirectoryProximityClient(filesPort),
      markdownLink: new MarkdownRecommendationClient(contentPort, filesPort, 'markdownLink'),
    },
  };
  const enrichUseCase = new EnrichEntryPointCandidatesUseCase(evidencePorts);

  console.log(`4. Running evaluation across ${tasks.length} Golden Tasks...\n`);

  let totalGoldSupported = 0;
  let totalGoldInTop5 = 0;
  let totalCandidatesInTop5 = 0;
  let totalCandidatesWithEvidence = 0;
  let totalFalsePositivesInTop5 = 0;
  let totalFalsePositivesUnsupported = 0;
  let totalEvidenceCount = 0;
  const latenciesMs: number[] = [];

  for (const task of tasks) {
    const disc = await discoveryUseCase.execute({
      task: task.task,
      projectIds: [project.id],
      maxCandidates: 10,
    });

    const start = performance.now();
    const enriched = await enrichUseCase.execute({
      task: task.task,
      projectIds: [project.id],
      candidates: disc.candidates,
      options: { enrichTopN: 5 },
    });
    const dur = performance.now() - start;
    latenciesMs.push(dur);

    const expectedSet = new Set(task.expectedEntryPoints);
    const top5 = enriched.slice(0, 5);

    for (const item of top5) {
      totalCandidatesInTop5++;
      const hasEv = item.evidence.length > 0;
      if (hasEv) {
        totalCandidatesWithEvidence++;
        totalEvidenceCount += item.evidence.length;
      }

      const isGold = expectedSet.has(item.candidate.relativePath);
      if (isGold) {
        totalGoldInTop5++;
        if (hasEv && item.supportScore >= 10) {
          totalGoldSupported++;
        }
      } else {
        totalFalsePositivesInTop5++;
        if (item.supportScore <= 10 || !hasEv) {
          totalFalsePositivesUnsupported++;
        }
      }
    }
  }

  latenciesMs.sort((a, b) => a - b);
  const avgLatency = latenciesMs.reduce((a, b) => a + b, 0) / latenciesMs.length;
  const p95Index = Math.floor(latenciesMs.length * 0.95);
  const p95Latency = latenciesMs[p95Index] ?? latenciesMs[latenciesMs.length - 1];

  console.log('========================================================');
  console.log('        PHASE 4 NATIVE EVIDENCE EVALUATION REPORT       ');
  console.log('========================================================');
  console.log(`Gold Support Rate:               ${((totalGoldSupported / (totalGoldInTop5 || 1)) * 100).toFixed(1)}% (${totalGoldSupported}/${totalGoldInTop5})`);
  console.log(`Evidence Coverage@5:             ${((totalCandidatesWithEvidence / (totalCandidatesInTop5 || 1)) * 100).toFixed(1)}% (${totalCandidatesWithEvidence}/${totalCandidatesInTop5})`);
  console.log(`False-positive Unsupported Rate: ${((totalFalsePositivesUnsupported / (totalFalsePositivesInTop5 || 1)) * 100).toFixed(1)}% (${totalFalsePositivesUnsupported}/${totalFalsePositivesInTop5})`);
  console.log(`Average Evidence / Candidate:    ${(totalEvidenceCount / (totalCandidatesInTop5 || 1)).toFixed(2)}`);
  console.log(`Enrichment Latency (avg):        ${avgLatency.toFixed(2)} ms`);
  console.log(`Enrichment Latency (p95):        ${p95Latency.toFixed(2)} ms`);
  console.log('========================================================\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

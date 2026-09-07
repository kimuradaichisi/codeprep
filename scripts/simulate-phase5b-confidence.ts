// scripts/simulate-phase5b-confidence.ts
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { DiscoverEntryPointCandidatesUseCase } from '../src/features/repository-context/application/DiscoverEntryPointCandidatesUseCase';
import { EnrichEntryPointCandidatesUseCase } from '../src/features/repository-context/application/EnrichEntryPointCandidatesUseCase';
import { evaluateContextConfidence } from '../src/features/repository-context/domain/ContextConfidenceEvaluator';
import { resolveAdaptivePackMode } from '../src/features/repository-context/application/AdaptiveContextStrategy';
import { RipgrepClient } from '../src/features/repository-context/infrastructure/search/RipgrepClient';
import { DependencyScanner } from '../src/features/engine/application/DependencyScanner';
import { GitCoChangeClient } from '../src/features/repository-context/infrastructure/git/GitCoChangeClient';
import { DirectoryProximityClient } from '../src/features/repository-context/infrastructure/recommendation/DirectoryProximityClient';
import { MarkdownRecommendationClient } from '../src/features/repository-context/infrastructure/recommendation/MarkdownRecommendationClient';
import { listProjectFiles } from '../src/features/repository-context/infrastructure/filesystem/ProjectFileTree';
import { readProjectFile, canReadProjectFile, getProjectFileSize } from '../src/features/repository-context/infrastructure/filesystem/ProjectFileContentReader';
import type { TaskDefinition, AgentTrialResult } from '../evaluation/agent-context/types';
import type { Project } from '../src/features/repository-context/domain/Project';

const ROOT = join(__dirname, '..');
const PROJECT: Project = { id: 'codeprep-root', name: 'codeprep', rootPath: ROOT };

function createServices() {
  const filePort = {
    list: async (p: Project) => {
      const paths = await listProjectFiles(p.rootPath);
      return Promise.all(paths.map(async (rel) => ({ relativePath: rel, size: await getProjectFileSize(p, rel) })));
    },
  };
  const fileContent = { read: readProjectFile, canRead: canReadProjectFile };
  const reg = { getByIds: async () => [PROJECT] };
  const discPorts = { projects: reg, files: filePort, ripgrep: new RipgrepClient(), fileContent };
  const enrichPorts = {
    projects: reg,
    files: filePort,
    fileContent,
    dependencyScanner: new DependencyScanner(),
    recommendations: {
      gitCoChange: new GitCoChangeClient(),
      directoryProximity: new DirectoryProximityClient(filePort),
      markdownLink: new MarkdownRecommendationClient(fileContent, filePort, 'markdownLink'),
    },
  };
  return { discover: new DiscoverEntryPointCandidatesUseCase(discPorts), enrich: new EnrichEntryPointCandidatesUseCase(enrichPorts) };
}

type SimulationRow = Readonly<{
  id: string;
  category: string;
  confidence: string;
  score: number;
  reasons: string;
  strategy: string;
  baseExplore: number;
  cpExplore: number;
  baseEntry: string;
  cpEntry: string;
}>;

async function runTask(task: TaskDefinition, s: ReturnType<typeof createServices>, bMap: Map<string, AgentTrialResult>, cMap: Map<string, AgentTrialResult>): Promise<SimulationRow> {
  const disc = await s.discover.execute({ task: task.task, projectIds: [PROJECT.id], maxCandidates: 10 });
  const enriched = await s.enrich.execute({ task: task.task, projectIds: [PROJECT.id], candidates: disc.candidates, options: { enrichTopN: 5 } });
  const conf = evaluateContextConfidence({ candidates: enriched });
  const strat = resolveAdaptivePackMode(conf);
  const b = bMap.get(task.id);
  const c = cMap.get(task.id);
  return {
    id: task.id,
    category: task.categoryName,
    confidence: conf.level.toUpperCase(),
    score: conf.score,
    reasons: conf.reasons.join(', '),
    strategy: strat.toUpperCase(),
    baseExplore: b?.explorationCallsBeforeEdit ?? 0,
    cpExplore: c?.explorationCallsBeforeEdit ?? 0,
    baseEntry: b?.correctEntryPointBeforeEdit ? 'YES' : 'NO',
    cpEntry: c?.correctEntryPointBeforeEdit ? 'YES' : 'NO',
  };
}

async function main() {
  console.log('Running Phase 5B trace offline simulation...');
  const trials: AgentTrialResult[] = JSON.parse(readFileSync(join(ROOT, 'evaluation/agent-context/results/trials.json'), 'utf-8'));
  const bMap = new Map<string, AgentTrialResult>();
  const cMap = new Map<string, AgentTrialResult>();
  trials.forEach((t) => (t.condition === 'baseline' ? bMap.set(t.taskId, t) : cMap.set(t.taskId, t)));

  const services = createServices();
  const rows: SimulationRow[] = [];
  for (let i = 1; i <= 8; i++) {
    const id = `TASK-${String(i).padStart(2, '0')}`;
    const task: TaskDefinition = JSON.parse(readFileSync(join(ROOT, `evaluation/agent-context/tasks/${id}.json`), 'utf-8'));
    rows.push(await runTask(task, services, bMap, cMap));
  }

  console.table(rows);
  const falseHigh = rows.filter((r) => ['TASK-04', 'TASK-06', 'TASK-08'].includes(r.id) && r.confidence === 'HIGH');
  console.log(`\nFalse HIGH Count in uncertain tasks (TASK-04, 06, 08): ${falseHigh.length}`);
  const outPath = join(ROOT, 'evaluation/agent-context/results/phase-6a-simulation.json');
  writeFileSync(outPath, JSON.stringify({ rows, falseHighCount: falseHigh.length }, null, 2), 'utf-8');
}

main().catch(console.error);

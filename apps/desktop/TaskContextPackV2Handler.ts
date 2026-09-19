// apps/desktop/TaskContextPackV2Handler.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { Project } from '../../src/features/repository-context/domain/Project';
import type { BuildTaskContextRequest, DesktopTaskContextResult } from './DesktopApi';
import type { AnalyzedCandidate } from '../../src/features/repository-context/application/ports';
import type { ContextManifest } from '../../src/features/repository-context/domain/ContextManifest';
import type { ContextEntry } from '../../src/features/repository-context/domain/ContextEntry';
import type { ContextPackV2, ContextPackV2Entry } from '../../src/features/repository-context/domain/workingset';
import { createWorkingSetBudget } from '../../src/features/repository-context/domain/workingset/WorkingSetBudget';
import { createRepositoryContextContainer } from '../../src/features/repository-context/infrastructure/composition/RepositoryContextContainer';
import { createPrepareContextPackV2UseCase } from '../../src/features/repository-context/infrastructure/workingset/createPrepareContextPackV2UseCase';
import {
  formatContextPackV2Markdown,
  formatContextPackV2Content,
} from '../../src/features/repository-context/infrastructure/formatting/ContextPackV2Formatter';

export async function handleBuildKnowledgePackV2(
  project: Project,
  request: BuildTaskContextRequest
): Promise<DesktopTaskContextResult> {
  const container = createRepositoryContextContainer(project.rootPath, project.id);
  const { useCase, store } = createPrepareContextPackV2UseCase(container);

  try {
    const snapshotId = await resolveSnapshotId(store, project.name);
    const budget = resolveV2Budget(request);
    const explicitPaths = resolveExplicitPaths(request);

    const packV2 = await useCase.execute({
      project,
      task: request.task,
      snapshotId,
      budget,
      explicitPaths,
      includeLegacyCandidates: true,
    });

    return toDesktopV2Result(project, request.task, packV2);
  } finally {
    await store.close();
  }
}

async function resolveSnapshotId(
  store: import('../../src/features/repository-context/infrastructure/knowledge/sqlite/SqliteRepositoryKnowledgeStore').SqliteRepositoryKnowledgeStore,
  projectName: string
): Promise<string> {
  const stats = await store.getStatistics('latest');
  if (stats.nodeCount > 0) return 'latest';

  const latest = (await store.findLatest(projectName)) ?? (await store.findLatest('codeprep-repo'));
  if (latest) return latest.snapshotId;

  const evalHeadStats = await store.getStatistics('eval-head');
  if (evalHeadStats.nodeCount > 0) return 'eval-head';

  return 'latest';
}


function resolveV2Budget(request: BuildTaskContextRequest) {
  const hasFiles = request.budget?.maxFiles !== undefined;
  const hasTokens = request.budget?.maxTokens !== undefined || request.tokenLimit !== undefined;
  if (!hasFiles && !hasTokens) return undefined;

  return createWorkingSetBudget({
    maxFiles: request.budget?.maxFiles ?? 10,
    maxEstimatedTokens: request.budget?.maxTokens ?? request.tokenLimit ?? 12000,
  });
}

function resolveExplicitPaths(request: BuildTaskContextRequest): readonly string[] | undefined {
  if (request.explicitPaths && request.explicitPaths.length > 0) {
    return request.explicitPaths;
  }
  if (request.entryPoints && request.entryPoints.length > 0) {
    return request.entryPoints;
  }
  return undefined;
}

function toDesktopV2Result(
  project: Project,
  task: string,
  packV2: ContextPackV2
): DesktopTaskContextResult {
  const markdown = formatContextPackV2Markdown(packV2);
  const content = formatContextPackV2Content(packV2);
  const candidates = packV2.context.map((e) => toAnalyzedCandidateV2(project.id, e));
  const manifest = buildV2LegacyManifest(project.id, task, packV2);

  return Object.freeze({
    manifest,
    markdown,
    content,
    resolvedStrategy: 'knowledge' as const,
    candidates: Object.freeze(candidates),
    warnings: Object.freeze([]),
    contextPackV2: packV2,
  });
}

function toAnalyzedCandidateV2(projectId: string, entry: ContextPackV2Entry): AnalyzedCandidate {
  return Object.freeze({
    projectId,
    relativePath: entry.path,
    reasons: ['pathAffinity' as const],
    score: entry.score,
    excluded: false,
    packMode: entry.granularity === 'FULL_FILE' ? 'full' : 'matchedSnippets',
  });
}

function buildV2LegacyManifest(projectId: string, task: string, packV2: ContextPackV2): ContextManifest {
  const entries: ContextEntry[] = packV2.context.map((e) => ({
    projectId,
    relativePath: e.path,
    role: e.role,
    packMode: e.granularity === 'FULL_FILE' ? 'full' : 'matchedSnippets',
    score: e.score,
    candidateReasons: ['pathAffinity' as const],
    recommendationReasons: [],
  }));


  return Object.freeze({
    projectId,
    task,
    entryPoints: packV2.workingSet.core.map((c) => c.relativePath),
    entries: Object.freeze(entries),
    budget: {
      bytes: packV2.metrics.estimatedTokens * 4,
      estimatedTokens: packV2.metrics.estimatedTokens,
      limit: packV2.metrics.budgetDecision.budget.maxEstimatedTokens,
      withinLimit: true,
    },
  });
}


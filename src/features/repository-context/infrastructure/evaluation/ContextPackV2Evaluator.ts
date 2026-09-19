// src/features/repository-context/infrastructure/evaluation/ContextPackV2Evaluator.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { GoldenTaskCase } from './TaskQueryEvaluator';
import type { ContextPackV2 } from '../../domain/workingset';
import { createRepositoryContextContainer } from '../composition/RepositoryContextContainer';
import { createPrepareContextPackV2UseCase } from '../workingset/createPrepareContextPackV2UseCase';

export interface ContextPackV2SummaryMetrics {
  readonly tasks: number;
  readonly mustHaveRecall: number;
  readonly avgFiles: number;
  readonly avgEstimatedTokens: number;
  readonly avgCompressionRatio: number;
  readonly avgIrrelevantRatio: number;
  readonly recallReserveContribution: number;
}

export interface TaskPackV2Detail {
  readonly taskId: string;
  readonly mustHaveRecall: number;
  readonly fileCount: number;
  readonly estimatedTokens: number;
  readonly compressionRatio: number;
  readonly irrelevantRatio: number;
  readonly recallReserveAddedMustHave: number;
  readonly includedPaths: readonly string[];
  readonly reservePaths: readonly string[];
}

export interface ContextPackV2EvaluationResult {
  readonly summary: ContextPackV2SummaryMetrics;
  readonly details: readonly TaskPackV2Detail[];
}

export class ContextPackV2Evaluator {
  public async evaluate(
    workspaceRoot: string,
    dbPath: string,
    snapshotId: string,
    cases: readonly GoldenTaskCase[]
  ): Promise<ContextPackV2EvaluationResult> {
    const container = createRepositoryContextContainer(workspaceRoot);
    const { useCase, store } = createPrepareContextPackV2UseCase(container, dbPath);

    try {
      const details: TaskPackV2Detail[] = [];
      for (const tc of cases) {
        const pack = await useCase.execute({
          project: container.project,
          task: tc.task,
          snapshotId,
          includeLegacyCandidates: true,
        });
        details.push(this.evaluateTaskPack(tc, pack));
      }
      const summary = this.aggregateSummary(details);
      return Object.freeze({ summary, details: Object.freeze(details) });
    } finally {
      await store.close();
    }
  }

  private evaluateTaskPack(tc: GoldenTaskCase, pack: ContextPackV2): TaskPackV2Detail {
    const uniquePaths = Array.from(new Set(pack.context.map((c) => c.path.replace(/\\/g, '/'))));
    const mustHaveNormalized = tc.mustHave.map((m) => m.replace(/\\/g, '/'));
    const niceToHaveNormalized = tc.niceToHave.map((n) => n.replace(/\\/g, '/'));

    const mustHaveFound = mustHaveNormalized.filter((m) => uniquePaths.includes(m)).length;
    const mustHaveRecall = mustHaveNormalized.length > 0 ? mustHaveFound / mustHaveNormalized.length : 1;

    const relevant = new Set([...mustHaveNormalized, ...niceToHaveNormalized]);
    const irrelevantCount = uniquePaths.filter((p) => !relevant.has(p)).length;
    const irrelevantRatio = uniquePaths.length > 0 ? irrelevantCount / uniquePaths.length : 0;

    const reservePaths = new Set(pack.workingSet.recallReserve.map((r) => r.relativePath.replace(/\\/g, '/')));
    const recallReserveAdded = mustHaveNormalized.filter((m) => reservePaths.has(m)).length;

    return {
      taskId: tc.id,
      mustHaveRecall: Number(mustHaveRecall.toFixed(3)),
      fileCount: pack.metrics.contextFiles,
      estimatedTokens: pack.metrics.estimatedTokens,
      compressionRatio: pack.metrics.compressionRatio,
      irrelevantRatio: Number(irrelevantRatio.toFixed(3)),
      recallReserveAddedMustHave: recallReserveAdded,
      includedPaths: Object.freeze(uniquePaths),
      reservePaths: Object.freeze(Array.from(reservePaths)),
    };
  }

  private aggregateSummary(details: readonly TaskPackV2Detail[]): ContextPackV2SummaryMetrics {
    const n = Math.max(1, details.length);
    const sum = (fn: (d: TaskPackV2Detail) => number) => details.reduce((acc, d) => acc + fn(d), 0);

    return Object.freeze({
      tasks: details.length,
      mustHaveRecall: Number((sum((d) => d.mustHaveRecall) / n).toFixed(3)),
      avgFiles: Number((sum((d) => d.fileCount) / n).toFixed(1)),
      avgEstimatedTokens: Math.round(sum((d) => d.estimatedTokens) / n),
      avgCompressionRatio: Number((sum((d) => d.compressionRatio) / n).toFixed(3)),
      avgIrrelevantRatio: Number((sum((d) => d.irrelevantRatio) / n).toFixed(3)),
      recallReserveContribution: sum((d) => d.recallReserveAddedMustHave),
    });
  }
}

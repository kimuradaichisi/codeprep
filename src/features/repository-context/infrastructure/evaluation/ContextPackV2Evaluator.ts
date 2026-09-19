// src/features/repository-context/infrastructure/evaluation/ContextPackV2Evaluator.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { GoldenTaskCase } from './TaskQueryEvaluator';
import type { ContextPackV2, TaskScope } from '../../domain/workingset';
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
  readonly capHitRate: number;
}

export interface ScopeBreakdownItem {
  readonly scope: TaskScope;
  readonly taskCount: number;
  readonly avgFilesBefore: number;
  readonly avgFilesAfter: number;
  readonly recallBefore: number;
  readonly recallAfter: number;
}

export interface AdaptiveBudgetComparison {
  readonly tasks: number;
  readonly scopeCounts: {
    readonly narrow: number;
    readonly standard: number;
    readonly broad: number;
  };
  readonly before: {
    readonly avgFiles: number;
    readonly avgTokens: number;
    readonly capHitRate: number;
    readonly mustHaveRecall: number;
  };
  readonly after: {
    readonly avgFiles: number;
    readonly avgTokens: number;
    readonly capHitRate: number;
    readonly mustHaveRecall: number;
  };
  readonly scopeBreakdown: readonly ScopeBreakdownItem[];
}

export interface TaskPackV2Detail {
  readonly taskId: string;
  readonly scope: TaskScope;
  readonly mustHaveRecall: number;
  readonly fileCount: number;
  readonly estimatedTokens: number;
  readonly compressionRatio: number;
  readonly irrelevantRatio: number;
  readonly recallReserveAddedMustHave: number;
  readonly capHit: boolean;
  readonly budgetMaxFiles: number;
  readonly includedPaths: readonly string[];
  readonly reservePaths: readonly string[];
}

export interface ContextPackV2EvaluationResult {
  readonly summary: ContextPackV2SummaryMetrics;
  readonly details: readonly TaskPackV2Detail[];
  readonly adaptiveBudget: AdaptiveBudgetComparison;
}

const BASELINE_7H_B: Readonly<Record<string, { files: number; tokens: number; recall: number }>> = Object.freeze({
  'TASK-01-IR-MAPPING': { files: 10, tokens: 7321, recall: 0.25 },
  'TASK-02-PORT-ADAPTER': { files: 9, tokens: 6177, recall: 1.0 },
  'TASK-03-COMPOSITION-DI': { files: 10, tokens: 6253, recall: 1.0 },
  'TASK-04-SQLITE-PERSISTENCE': { files: 8, tokens: 8346, recall: 0.5 },
  'TASK-05-IR-DOMAIN': { files: 10, tokens: 10973, recall: 0.667 },
  'TASK-06-INCREMENTAL-REFRESH': { files: 10, tokens: 15799, recall: 0.667 },
  'TASK-07-DOCS-CENTRIC': { files: 10, tokens: 13930, recall: 1.0 },
});

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
      const adaptiveBudget = this.buildAdaptiveComparison(details);
      return Object.freeze({ summary, details: Object.freeze(details), adaptiveBudget });
    } finally {
      await store.close();
    }
  }

  private evaluateTaskPack(tc: GoldenTaskCase, pack: ContextPackV2): TaskPackV2Detail {
    const uniquePaths = Array.from(new Set(pack.context.map((c) => c.path.replace(/\\/g, '/'))));
    const coverage = this.calculateCoverageMetrics(tc, uniquePaths);
    const reservePaths = new Set(pack.workingSet.recallReserve.map((r) => r.relativePath.replace(/\\/g, '/')));
    const recallReserveAdded = tc.mustHave.map((m) => m.replace(/\\/g, '/')).filter((m) => reservePaths.has(m)).length;

    const scope = pack.metrics.budgetDecision?.scope ?? 'standard';
    const budgetMaxFiles = pack.metrics.budgetDecision?.budget.maxFiles ?? 10;

    return {
      taskId: tc.id,
      scope,
      mustHaveRecall: coverage.mustHaveRecall,
      fileCount: pack.metrics.contextFiles,
      estimatedTokens: pack.metrics.estimatedTokens,
      compressionRatio: pack.metrics.compressionRatio,
      irrelevantRatio: coverage.irrelevantRatio,
      recallReserveAddedMustHave: recallReserveAdded,
      capHit: pack.metrics.contextFiles >= budgetMaxFiles,
      budgetMaxFiles,
      includedPaths: Object.freeze(uniquePaths),
      reservePaths: Object.freeze(Array.from(reservePaths)),
    };
  }

  private calculateCoverageMetrics(
    tc: GoldenTaskCase,
    uniquePaths: readonly string[]
  ): { mustHaveRecall: number; irrelevantRatio: number } {
    const mustHaveNorm = tc.mustHave.map((m) => m.replace(/\\/g, '/'));
    const niceToHaveNorm = tc.niceToHave.map((n) => n.replace(/\\/g, '/'));
    const found = mustHaveNorm.filter((m) => uniquePaths.includes(m)).length;
    const mustHaveRecall = mustHaveNorm.length > 0 ? Number((found / mustHaveNorm.length).toFixed(3)) : 1;

    const relevant = new Set([...mustHaveNorm, ...niceToHaveNorm]);
    const irrelevantCount = uniquePaths.filter((p) => !relevant.has(p)).length;
    const irrelevantRatio = uniquePaths.length > 0 ? Number((irrelevantCount / uniquePaths.length).toFixed(3)) : 0;

    return { mustHaveRecall, irrelevantRatio };
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
      capHitRate: Number((details.filter((d) => d.capHit).length / n).toFixed(3)),
    });
  }

  private buildAdaptiveComparison(details: readonly TaskPackV2Detail[]): AdaptiveBudgetComparison {
    const scopeCounts = {
      narrow: details.filter((d) => d.scope === 'narrow').length,
      standard: details.filter((d) => d.scope === 'standard').length,
      broad: details.filter((d) => d.scope === 'broad').length,
    };

    const before = {
      avgFiles: 9.6,
      avgTokens: 9828,
      capHitRate: 0.857,
      mustHaveRecall: 0.726,
    };

    return Object.freeze({
      tasks: details.length,
      scopeCounts: Object.freeze(scopeCounts),
      before: Object.freeze(before),
      after: this.aggregateAfterMetrics(details),
      scopeBreakdown: this.buildScopeBreakdown(details),
    });
  }

  private aggregateAfterMetrics(details: readonly TaskPackV2Detail[]) {
    const n = Math.max(1, details.length);
    const sum = (fn: (d: TaskPackV2Detail) => number) => details.reduce((acc, d) => acc + fn(d), 0);

    return Object.freeze({
      avgFiles: Number((sum((d) => d.fileCount) / n).toFixed(1)),
      avgTokens: Math.round(sum((d) => d.estimatedTokens) / n),
      capHitRate: Number((details.filter((d) => d.capHit).length / n).toFixed(3)),
      mustHaveRecall: Number((sum((d) => d.mustHaveRecall) / n).toFixed(3)),
    });
  }

  private buildScopeBreakdown(details: readonly TaskPackV2Detail[]): readonly ScopeBreakdownItem[] {
    const scopes: TaskScope[] = ['narrow', 'standard', 'broad'];
    return Object.freeze(scopes.map((scope) => {
      const matched = details.filter((d) => d.scope === scope);
      const count = matched.length;
      if (count === 0) {
        return { scope, taskCount: 0, avgFilesBefore: 0, avgFilesAfter: 0, recallBefore: 0, recallAfter: 0 };
      }
      const filesBefore = matched.reduce((acc, d) => acc + (BASELINE_7H_B[d.taskId]?.files ?? 10), 0) / count;
      const filesAfter = matched.reduce((acc, d) => acc + d.fileCount, 0) / count;
      const recBefore = matched.reduce((acc, d) => acc + (BASELINE_7H_B[d.taskId]?.recall ?? 0), 0) / count;
      const recAfter = matched.reduce((acc, d) => acc + d.mustHaveRecall, 0) / count;

      return {
        scope,
        taskCount: count,
        avgFilesBefore: Number(filesBefore.toFixed(1)),
        avgFilesAfter: Number(filesAfter.toFixed(1)),
        recallBefore: Number(recBefore.toFixed(3)),
        recallAfter: Number(recAfter.toFixed(3)),
      };
    }));
  }
}

// src/features/repository-context/domain/workingset/TaskScopeClassifier.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { TaskScope, BudgetSignal } from './TaskScope';

export interface ScopeClassificationInput {
  readonly explicitPathCount: number;
  readonly seedCount: number;
  readonly highConfidenceSeedCount: number;
  readonly subgraphNodeCount: number;
  readonly topScore: number;
  readonly secondScore: number;
  readonly fifthScore: number;
  readonly relationTypes: readonly string[];
  readonly seedFeatureCount: number;
  readonly dominantFeatureRatio: number;
}

export interface ScopeClassificationResult {
  readonly scope: TaskScope;
  readonly signals: readonly BudgetSignal[];
  readonly reasons: readonly string[];
}

export class TaskScopeClassifier {
  public static classify(input: ScopeClassificationInput): ScopeClassificationResult {
    const signals = this.extractSignals(input);
    const scoreGap1_2 = Number((input.topScore - input.secondScore).toFixed(3));

    if (input.explicitPathCount > 0) {
      return this.buildResult('narrow', signals, ['Explicit paths provided; focused scope']);
    }

    if (this.isNarrowScope(input, scoreGap1_2)) {
      return this.buildResult('narrow', signals, [
        `High feature concentration (${(input.dominantFeatureRatio * 100).toFixed(0)}% in primary feature, topScore=${input.topScore.toFixed(2)})`,
      ]);
    }

    if (this.isBroadScope(input, scoreGap1_2)) {
      return this.buildResult('broad', signals, [
        `Dispersed cross-feature scope (${input.seedFeatureCount} seed features, ${(input.dominantFeatureRatio * 100).toFixed(0)}% concentration)`,
      ]);
    }

    return this.buildResult('standard', signals, [
      `Balanced task scope (${input.seedFeatureCount} seed features, ${(input.dominantFeatureRatio * 100).toFixed(0)}% concentration)`,
    ]);
  }

  private static isNarrowScope(input: ScopeClassificationInput, _gap1_2: number): boolean {
    if (input.highConfidenceSeedCount >= 3 && input.seedFeatureCount >= 2) {
      return false;
    }
    if (input.dominantFeatureRatio >= 0.75 && input.topScore >= 0.85) {
      return true;
    }
    return input.subgraphNodeCount <= 16 && input.topScore >= 0.9;
  }

  private static isBroadScope(input: ScopeClassificationInput, _gap1_2: number): boolean {
    if (input.dominantFeatureRatio >= 0.6) {
      return false;
    }
    if (input.seedFeatureCount >= 3) {
      return true;
    }
    return input.dominantFeatureRatio <= 0.45 && input.subgraphNodeCount >= 20;
  }

  private static extractSignals(input: ScopeClassificationInput): readonly BudgetSignal[] {
    return Object.freeze([
      { name: 'explicitPathCount', value: input.explicitPathCount, interpretation: input.explicitPathCount > 0 ? 'Focused' : 'None' },
      { name: 'seedCount', value: input.seedCount, interpretation: `${input.seedCount} seeds` },
      { name: 'subgraphNodeCount', value: input.subgraphNodeCount, interpretation: `${input.subgraphNodeCount} nodes` },
      { name: 'topScore', value: input.topScore, interpretation: `Top score ${input.topScore.toFixed(3)}` },
      { name: 'dominantFeatureRatio', value: Number((input.dominantFeatureRatio * 100).toFixed(1)), interpretation: `${(input.dominantFeatureRatio * 100).toFixed(0)}% in primary feature` },
      { name: 'relationDiversity', value: input.relationTypes.length, interpretation: `${input.relationTypes.length} relation kinds` },
    ]);
  }

  private static buildResult(
    scope: TaskScope,
    signals: readonly BudgetSignal[],
    reasons: readonly string[]
  ): ScopeClassificationResult {
    return Object.freeze({ scope, signals, reasons: Object.freeze(reasons) });
  }
}

// src/features/repository-context/application/workingset/PrepareContextPackV2UseCase.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { Project } from '../../domain/Project';
import type { QueryRelevantSubgraphUseCase } from '../ir/query/QueryRelevantSubgraphUseCase';
import type { DiscoverEntryPointCandidatesUseCase } from '../DiscoverEntryPointCandidatesUseCase';
import type { BuildContextPackV2UseCase } from './BuildContextPackV2UseCase';
import type {
  ContextPackV2,
  WorkingSetBudget,
  WorkingSet,
  ExcludedContextEntry,
  AdaptiveBudgetDecision,
} from '../../domain/workingset';
import {
  WorkingSetSelector,
  AdaptiveBudgetResolver,
} from '../../domain/workingset';
import { SubgraphToCandidateMapper } from './SubgraphToCandidateMapper';
import type { LegacyCandidateInput } from '../../domain/workingset/RecallReserveCollector';

import type { RepositoryRevisionPort } from '../ir/ports/RepositoryRevisionPort';
import type { RepositoryKnowledgeStore } from '../ir/persistence/RepositoryKnowledgeStore';
import type { RepositoryRelevantSubgraph } from '../ir/query/TaskQueryDto';

export interface PrepareContextPackV2Input {
  readonly project: Project;
  readonly task: string;
  readonly snapshotId: string;
  readonly explicitPaths?: readonly string[];
  readonly budget?: WorkingSetBudget;
  readonly includeLegacyCandidates?: boolean;
}

export interface PrepareContextPackV2Ports {
  readonly querySubgraphUseCase: QueryRelevantSubgraphUseCase;
  readonly discoverUseCase?: DiscoverEntryPointCandidatesUseCase;
  readonly buildContextPackV2UseCase: BuildContextPackV2UseCase;
  readonly revisionPort?: RepositoryRevisionPort;
  readonly knowledgeStore?: RepositoryKnowledgeStore;
}

export class PrepareContextPackV2UseCase {
  constructor(private readonly ports: PrepareContextPackV2Ports) {}

  public async execute(input: PrepareContextPackV2Input): Promise<ContextPackV2> {
    const subgraph = await this.ports.querySubgraphUseCase.execute({
      task: input.task,
      snapshotId: input.snapshotId,
      optionalExplicitPaths: input.explicitPaths,
    });

    const budgetDecision = AdaptiveBudgetResolver.resolve({
      task: input.task,
      subgraph,
      explicitPaths: input.explicitPaths,
      userBudget: input.budget,
    });

    const { workingSet, excluded } = await this.selectWorkingSetForTask(input, subgraph, budgetDecision);
    const health = await this.resolveHealthInfo(input.project.rootPath);
    const confidence = this.buildConfidence(subgraph, health);

    return this.ports.buildContextPackV2UseCase.execute({
      project: input.project,
      workingSet,
      excluded,
      subgraphNodeCount: subgraph.rankedNodes.length,
      confidence,
      budgetDecision,
    });
  }

  private async selectWorkingSetForTask(
    input: PrepareContextPackV2Input,
    subgraph: RepositoryRelevantSubgraph,
    decision: AdaptiveBudgetDecision
  ): Promise<{ workingSet: WorkingSet; excluded: readonly ExcludedContextEntry[] }> {
    const legacyCandidates = await this.resolveLegacyCandidates(input);
    const graphCandidates = SubgraphToCandidateMapper.map(subgraph);

    return WorkingSetSelector.select({
      task: input.task,
      graphCandidates,
      legacyCandidates,
      budget: decision.budget,
      scope: decision.scope,
      recallReserveLimit: decision.recallReserveLimit,
    });
  }

  private async resolveHealthInfo(rootPath: string): Promise<{
    currentRevision: string | null;
    snapshotRevision: string | null;
    isClean: boolean;
  }> {
    const currentRevision = this.ports.revisionPort
      ? await this.ports.revisionPort.currentRevision(rootPath)
      : null;
    const isClean = this.ports.revisionPort
      ? await this.ports.revisionPort.isWorkingTreeClean(rootPath)
      : true;
    const snapshot = this.ports.knowledgeStore
      ? (await this.ports.knowledgeStore.findByRevision(rootPath, currentRevision ?? ''))
        ?? (await this.ports.knowledgeStore.findLatest(rootPath))
      : null;
    return { currentRevision, snapshotRevision: snapshot?.revision ?? null, isClean };
  }

  private buildConfidence(
    subgraph: RepositoryRelevantSubgraph,
    health: { currentRevision: string | null; snapshotRevision: string | null; isClean: boolean }
  ): Readonly<Record<string, unknown>> {
    const staleSnapshot = Boolean(
      health.currentRevision &&
      health.snapshotRevision &&
      health.currentRevision !== health.snapshotRevision
    );
    const dirtyWorkingTree = !health.isClean;
    const warnings = this.collectHealthWarnings(health, staleSnapshot, dirtyWorkingTree, subgraph.seeds.length === 0);
    const topScore = subgraph.rankedNodes[0]?.score ?? 0;

    return Object.freeze({
      level: this.resolveConfidenceLevel(subgraph.seeds.length, topScore),
      seedCount: subgraph.seeds.length,
      topScore,
      staleSnapshot,
      dirtyWorkingTree,
      refreshRequired: staleSnapshot,
      warnings: Object.freeze(warnings),
    });
  }

  private collectHealthWarnings(
    health: { currentRevision: string | null; snapshotRevision: string | null },
    staleSnapshot: boolean,
    dirtyWorkingTree: boolean,
    noSeeds: boolean
  ): string[] {
    const warnings: string[] = [];
    if (staleSnapshot) {
      warnings.push(`Snapshot revision (${health.snapshotRevision?.slice(0, 8)}) differs from HEAD (${health.currentRevision?.slice(0, 8)}). Refresh required.`);
    }
    if (dirtyWorkingTree) {
      warnings.push('Working tree has uncommitted changes not reflected in snapshot.');
    }
    if (noSeeds) {
      warnings.push('No relevant seeds found for task.');
    }
    return warnings;
  }

  private resolveConfidenceLevel(seedCount: number, topScore: number): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (seedCount === 0) {
      return 'LOW';
    }
    return topScore >= 0.7 ? 'HIGH' : 'MEDIUM';
  }

  private async resolveLegacyCandidates(
    input: PrepareContextPackV2Input
  ): Promise<readonly LegacyCandidateInput[]> {
    if (!input.includeLegacyCandidates || !this.ports.discoverUseCase) {
      return Object.freeze([]);
    }
    const res = await this.ports.discoverUseCase.execute({
      task: input.task,
      projectIds: [input.project.id],
      maxCandidates: 20,
    });
    return Object.freeze(
      res.candidates.map((c) => ({
        relativePath: c.relativePath,
        score: c.score,
        reasons: c.reasons,
        matchedTerms: c.matchedTerms,
      }))
    );
  }
}

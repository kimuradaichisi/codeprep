import type { RepositoryIR } from '../../../domain/ir';
import type { RepositoryChangeSet } from '../ports/RepositoryRevisionPort';
import { resolveDependentClosure } from './ImpactResolver';
import type { ProducerPlan, RefreshPlan } from './RefreshPlan';

function planLocalProducers(activeChangedPaths: readonly string[]): ProducerPlan[] {
  return [
    { producer: 'repository-index', strategy: 'FILE_LOCAL', targetPaths: activeChangedPaths, reason: 'Path-level changes' },
    { producer: 'structured-knowledge', strategy: 'FILE_LOCAL', targetPaths: activeChangedPaths, reason: 'Symbol and doc definitions in source' },
    { producer: 'dependency-scanner', strategy: 'FILE_LOCAL', targetPaths: activeChangedPaths, reason: 'Import statements in source' },
    { producer: 'typescript-wiring', strategy: 'FILE_LOCAL', targetPaths: activeChangedPaths, reason: 'Composition and new expressions in source' },
  ];
}

function planLanguageProducer(changedPaths: readonly string[], ir: RepositoryIR): ProducerPlan {
  const closure = resolveDependentClosure(changedPaths, ir);
  if (closure.isFullFallback) {
    return { producer: 'typescript-language', strategy: 'PRODUCER_FULL', targetPaths: [], reason: 'Compiler configuration changed' };
  }
  return {
    producer: 'typescript-language',
    strategy: 'DEPENDENT_CLOSURE',
    targetPaths: closure.paths,
    reason: 'Incoming references and inheritance closure',
  };
}

function getActiveSourcePaths(cs: RepositoryChangeSet): readonly string[] {
  const list = [...cs.added, ...cs.modified, ...cs.renamed.map(r => r.newPath)];
  return Object.freeze(Array.from(new Set(list)));
}

export class RefreshPlanner {
  public plan(params: {
    repositoryId: string;
    previousSnapshotId: string;
    previousRevision: string;
    targetRevision: string;
    changeSet: RepositoryChangeSet;
    previousIR: RepositoryIR;
  }): RefreshPlan {
    const { repositoryId, previousSnapshotId, previousRevision, targetRevision, changeSet, previousIR } = params;
    const activePaths = getActiveSourcePaths(changeSet);
    const localPlans = planLocalProducers(activePaths);
    const langPlan = planLanguageProducer(changeSet.allChangedPaths, previousIR);
    const gitPlan: ProducerPlan = { producer: 'git-cochange', strategy: 'PRODUCER_FULL', targetPaths: [], reason: 'Global commit frequency update' };
    const docPlan: ProducerPlan = { producer: 'docgraph', strategy: 'DEPENDENT_CLOSURE', targetPaths: activePaths, reason: 'Document reference pairs' };

    return Object.freeze({
      repositoryId,
      fromSnapshotId: previousSnapshotId,
      fromRevision: previousRevision,
      toRevision: targetRevision,
      changeSet,
      producerPlans: Object.freeze([...localPlans, langPlan, gitPlan, docPlan]),
      requiresFullRebuild: false,
      plannedAt: new Date().toISOString(),
    });
  }
}

import type { RepositoryChangeSet } from '../ports/RepositoryRevisionPort';

export type RefreshStrategy = 'FILE_LOCAL' | 'DEPENDENT_CLOSURE' | 'PRODUCER_FULL' | 'NO_OP';

export interface ProducerPlan {
  readonly producer: string;
  readonly strategy: RefreshStrategy;
  readonly targetPaths: readonly string[];
  readonly reason: string;
}

export interface RefreshPlan {
  readonly repositoryId: string;
  readonly fromSnapshotId: string;
  readonly fromRevision: string;
  readonly toRevision: string;
  readonly changeSet: RepositoryChangeSet;
  readonly producerPlans: readonly ProducerPlan[];
  readonly requiresFullRebuild: boolean;
  readonly plannedAt: string;
}

import type { RepositoryIR, RepositoryNode, RepositoryEdge, RepositorySnapshot } from '../../../domain/ir';
import { createRepositorySnapshot } from '../../../domain/ir';
import type { RepositoryKnowledgeStore } from '../persistence/RepositoryKnowledgeStore';
import type { RepositoryChangeSet, RepositoryRevisionPort } from '../ports/RepositoryRevisionPort';
import { IRInvalidator } from '../refresh/IRInvalidator';
import { assembleRepositoryIR } from '../refresh/IRSnapshotAssembler';
import type { RefreshPlan } from '../refresh/RefreshPlan';
import { RefreshPlanner } from '../refresh/RefreshPlanner';

export interface RefreshMetrics {
  readonly status: 'REFRESHED' | 'NO_OP' | 'DIRTY_WORKTREE' | 'FULL_REBUILD_REQUIRED';
  readonly fromRevision?: string;
  readonly toRevision?: string;
  readonly changedFiles: number;
  readonly reusedNodes: number;
  readonly reusedEdges: number;
  readonly regeneratedNodes: number;
  readonly regeneratedEdges: number;
  readonly elapsedMs: number;
}

export interface IncrementalProducerExecutionInput {
  readonly plan: RefreshPlan;
  readonly newSnapshot: RepositorySnapshot;
  readonly previousIR: RepositoryIR;
}

export interface IncrementalProducerExecutionResult {
  readonly addedNodes: readonly RepositoryNode[];
  readonly addedEdges: readonly RepositoryEdge[];
}

export interface RefreshRepositoryKnowledgeInput {
  readonly repositoryId: string;
  readonly workspaceRoot: string;
  readonly previousSnapshotId: string;
  readonly targetRevision?: string;
  readonly store: RepositoryKnowledgeStore;
  readonly revisionPort: RepositoryRevisionPort;
  readonly executeProducers: (input: IncrementalProducerExecutionInput) => Promise<IncrementalProducerExecutionResult>;
}

export interface RefreshRepositoryKnowledgeResult {
  readonly status: 'REFRESHED' | 'NO_OP' | 'DIRTY_WORKTREE' | 'FULL_REBUILD_REQUIRED';
  readonly snapshot?: RepositorySnapshot;
  readonly plan?: RefreshPlan;
  readonly ir?: RepositoryIR;
  readonly metrics?: RefreshMetrics;
  readonly reason?: string;
}

export class RefreshRepositoryKnowledgeUseCase {
  constructor(
    private readonly planner = new RefreshPlanner(),
    private readonly invalidator = new IRInvalidator(),
  ) {}

  public async execute(input: RefreshRepositoryKnowledgeInput): Promise<RefreshRepositoryKnowledgeResult> {
    const t0 = Date.now();
    const clean = await input.revisionPort.isWorkingTreeClean(input.workspaceRoot);
    if (!clean) return { status: 'DIRTY_WORKTREE', reason: 'Working tree is dirty; stable snapshot rejected.' };

    const currentRev = input.targetRevision ?? await input.revisionPort.currentRevision(input.workspaceRoot);
    if (!currentRev) return { status: 'FULL_REBUILD_REQUIRED', reason: 'Unable to resolve git revision.' };

    const previousIR = await input.store.load(input.previousSnapshotId);
    if (!previousIR) return { status: 'FULL_REBUILD_REQUIRED', reason: 'Previous snapshot not found in store.' };

    if (previousIR.snapshot.revision === currentRev) {
      return this.buildNoOpResult(previousIR, t0);
    }

    const changeSet = await input.revisionPort.diff(input.workspaceRoot, previousIR.snapshot.revision ?? '', currentRev);
    if (changeSet.allChangedPaths.length === 0) return this.buildNoOpResult(previousIR, t0);

    return this.executeIncrementalAssembly(input, previousIR, currentRev, changeSet, t0);
  }

  private buildNoOpResult(previousIR: RepositoryIR, t0: number): RefreshRepositoryKnowledgeResult {
    const rev = previousIR.snapshot.revision ?? '';
    return {
      status: 'NO_OP', snapshot: previousIR.snapshot, ir: previousIR,
      metrics: {
        status: 'NO_OP', fromRevision: rev, toRevision: rev,
        changedFiles: 0, reusedNodes: previousIR.nodes.size, reusedEdges: previousIR.edges.length,
        regeneratedNodes: 0, regeneratedEdges: 0, elapsedMs: Date.now() - t0,
      },
    };
  }

  private createPlan(
    input: RefreshRepositoryKnowledgeInput,
    previousIR: RepositoryIR,
    targetRevision: string,
    changeSet: RepositoryChangeSet,
  ): RefreshPlan {
    return this.planner.plan({
      repositoryId: input.repositoryId,
      previousSnapshotId: previousIR.snapshot.snapshotId,
      previousRevision: previousIR.snapshot.revision ?? '',
      targetRevision,
      changeSet,
      previousIR,
    });
  }

  private async executeIncrementalAssembly(
    input: RefreshRepositoryKnowledgeInput,
    previousIR: RepositoryIR,
    targetRevision: string,
    changeSet: RepositoryChangeSet,
    t0: number,
  ): Promise<RefreshRepositoryKnowledgeResult> {
    const plan = this.createPlan(input, previousIR, targetRevision, changeSet);
    const invalidation = this.invalidator.invalidate(previousIR, plan);
    const newSnapshot = createRefreshedSnapshot(input.repositoryId, input.workspaceRoot, targetRevision);
    const producerResult = await input.executeProducers({ plan, newSnapshot, previousIR });

    const newIR = await assembleAndPersist(input.store, newSnapshot, invalidation, producerResult);
    const metrics = buildRefreshedMetrics(previousIR, targetRevision, changeSet, invalidation, producerResult, t0);
    return { status: 'REFRESHED', snapshot: newSnapshot, plan, ir: newIR, metrics };
  }
}

async function assembleAndPersist(
  store: RepositoryKnowledgeStore,
  newSnapshot: RepositorySnapshot,
  invalidation: ReturnType<IRInvalidator['invalidate']>,
  producerResult: IncrementalProducerExecutionResult,
): Promise<RepositoryIR> {
  const newIR = assembleRepositoryIR({
    newSnapshot,
    retainedNodes: invalidation.retainedNodes,
    retainedEdges: invalidation.retainedEdges,
    addedNodes: producerResult.addedNodes,
    addedEdges: producerResult.addedEdges,
  });
  await store.save(newIR);
  return newIR;
}

function createRefreshedSnapshot(repositoryId: string, workspaceRoot: string, revision: string): RepositorySnapshot {
  return createRepositorySnapshot({
    snapshotId: `snap-${Date.now()}`,
    repositoryId,
    workspaceRoot,
    revision,
    createdAt: new Date().toISOString(),
  });
}

function buildRefreshedMetrics(
  previousIR: RepositoryIR,
  targetRevision: string,
  changeSet: RepositoryChangeSet,
  invalidation: ReturnType<IRInvalidator['invalidate']>,
  producerResult: IncrementalProducerExecutionResult,
  t0: number,
): RefreshMetrics {
  return {
    status: 'REFRESHED',
    fromRevision: previousIR.snapshot.revision,
    toRevision: targetRevision,
    changedFiles: changeSet.allChangedPaths.length,
    reusedNodes: invalidation.retainedNodes.length,
    reusedEdges: invalidation.retainedEdges.length,
    regeneratedNodes: producerResult.addedNodes.length,
    regeneratedEdges: producerResult.addedEdges.length,
    elapsedMs: Date.now() - t0,
  };
}

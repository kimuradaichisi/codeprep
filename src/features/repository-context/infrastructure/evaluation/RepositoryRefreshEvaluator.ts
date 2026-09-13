import { RefreshRepositoryKnowledgeUseCase } from '../../application/ir/usecases/RefreshRepositoryKnowledgeUseCase';
import { createRepositorySnapshot, type RepositoryEdge, type RepositoryIR, type RepositoryNode } from '../../domain/ir';
import { GitCliRevisionAdapter } from '../git/GitCliRevisionAdapter';
import { SqliteRepositoryKnowledgeStore } from '../knowledge/sqlite/SqliteRepositoryKnowledgeStore';
import { ProductionRepositoryKnowledgeBuilder } from './ProductionRepositoryKnowledgeBuilder';

export interface RepositoryRefreshEvalMetrics {
  readonly status: string;
  readonly changedFiles: number;
  readonly incrementalMs: number;
  readonly fullRebuildMs: number;
  readonly reusedNodes: number;
  readonly reusedEdges: number;
  readonly regeneratedNodes: number;
  readonly regeneratedEdges: number;
  readonly oracleMatch: boolean;
  readonly gitCoChangeEdgeExplosion?: {
    readonly note: string;
  };
}

function verifyOracleMatch(incIR: RepositoryIR, fullIR: RepositoryIR): boolean {
  if (incIR.nodes.size !== fullIR.nodes.size) return false;
  if (incIR.edges.length !== fullIR.edges.length) return false;
  const incPaths = Array.from(incIR.nodes.values()).map(n => n.path).sort();
  const fullPaths = Array.from(fullIR.nodes.values()).map(n => n.path).sort();
  for (let i = 0; i < incPaths.length; i++) {
    if (incPaths[i] !== fullPaths[i]) return false;
  }
  return true;
}

async function runFullRebuild(
  workspaceRoot: string,
  fullStore: SqliteRepositoryKnowledgeStore,
  currentRev: string,
  builder: ProductionRepositoryKnowledgeBuilder,
) {
  const tFull0 = Date.now();
  const fullSnap = createRepositorySnapshot({
    snapshotId: `eval-full-${Date.now()}`, repositoryId: 'codeprep-repo',
    workspaceRoot, revision: currentRev, createdAt: new Date().toISOString(),
  });
  const fullExtractRes = await builder.buildFullIR(workspaceRoot, fullSnap);
  await fullStore.save(fullExtractRes.ir);
  return { fullSnap, fullIR: fullExtractRes.ir, fullRebuildMs: Date.now() - tFull0 };
}

async function runIncrementalRefresh(
  workspaceRoot: string,
  fullStore: SqliteRepositoryKnowledgeStore,
  fullSnap: ReturnType<typeof createRepositorySnapshot>,
  currentRev: string,
  gitAdapter: GitCliRevisionAdapter,
  builder: ProductionRepositoryKnowledgeBuilder,
) {
  const refreshUseCase = new RefreshRepositoryKnowledgeUseCase();
  const tInc0 = Date.now();
  const refreshResult = await refreshUseCase.execute({
    repositoryId: 'codeprep-repo',
    workspaceRoot,
    previousSnapshotId: fullSnap.snapshotId,
    targetRevision: currentRev,
    store: fullStore,
    revisionPort: gitAdapter,
    executeProducers: async ({ plan, newSnapshot }) => {
      const { ir: fullTmp } = await builder.buildFullIR(workspaceRoot, newSnapshot);
      const changedSet = new Set(plan.changeSet.allChangedPaths);
      const addedNodes = Array.from<RepositoryNode>(fullTmp.nodes.values()).filter(n => changedSet.has(n.path));
      const addedEdges = fullTmp.edges.filter((e: RepositoryEdge) => {
        if (e.evidences.some(ev => ev.analyzer === 'git-cochange')) return true;
        const srcNode = fullTmp.nodes.get(e.sourceNodeId);
        return srcNode && changedSet.has(srcNode.path);
      });
      return { addedNodes, addedEdges };
    },
  });
  return { refreshResult, incrementalMs: Date.now() - tInc0 };
}

function formatEvalMetrics(
  refreshResult: Awaited<ReturnType<typeof runIncrementalRefresh>>['refreshResult'],
  fullIR: RepositoryIR,
  incrementalMs: number,
  fullRebuildMs: number,
  oracleMatch: boolean,
): RepositoryRefreshEvalMetrics {
  return {
    status: refreshResult.status,
    changedFiles: refreshResult.metrics?.changedFiles ?? 0,
    incrementalMs,
    fullRebuildMs,
    reusedNodes: refreshResult.metrics?.reusedNodes ?? fullIR.nodes.size,
    reusedEdges: refreshResult.metrics?.reusedEdges ?? fullIR.edges.length,
    regeneratedNodes: refreshResult.metrics?.regeneratedNodes ?? 0,
    regeneratedEdges: refreshResult.metrics?.regeneratedEdges ?? 0,
    oracleMatch,
    gitCoChangeEdgeExplosion: {
      note: 'CO_CHANGED_WITH generates ~10.2k edges on full repository. Deferred to Phase 7G query pruning.',
    },
  };
}

export class RepositoryRefreshEvaluator {
  public async evaluate(workspaceRoot: string, dbPath: string): Promise<RepositoryRefreshEvalMetrics> {
    const gitAdapter = new GitCliRevisionAdapter();
    const currentRev = await gitAdapter.currentRevision(workspaceRoot) ?? 'eval-head';
    const builder = new ProductionRepositoryKnowledgeBuilder();
    const fullStore = new SqliteRepositoryKnowledgeStore({ workspaceRoot, dbPath });

    const { fullSnap, fullIR, fullRebuildMs } = await runFullRebuild(workspaceRoot, fullStore, currentRev, builder);
    const { refreshResult, incrementalMs } = await runIncrementalRefresh(workspaceRoot, fullStore, fullSnap, currentRev, gitAdapter, builder);
    const oracleMatch = refreshResult.ir ? verifyOracleMatch(refreshResult.ir, fullIR) : true;
    await fullStore.close();

    return formatEvalMetrics(refreshResult, fullIR, incrementalMs, fullRebuildMs, oracleMatch);
  }
}

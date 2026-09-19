import type { RepositoryKnowledgeStore } from '../persistence/RepositoryKnowledgeStore';
import { GraphTraversalEngine } from './GraphTraversalEngine';
import { RelevantNodeRanker } from './RelevantNodeRanker';
import { SeedResolver } from './SeedResolver';
import type { RepositoryRelevantSubgraph, RepositoryTaskQuery } from './TaskQueryDto';

export class QueryRelevantSubgraphUseCase {
  private readonly seedResolver: SeedResolver;
  private readonly traversalEngine: GraphTraversalEngine;
  private readonly ranker: RelevantNodeRanker;

  constructor(private readonly store: RepositoryKnowledgeStore) {
    this.seedResolver = new SeedResolver(store);
    this.traversalEngine = new GraphTraversalEngine(store);
    this.ranker = new RelevantNodeRanker();
  }

  public async execute(query: RepositoryTaskQuery): Promise<RepositoryRelevantSubgraph> {
    const t0 = Date.now();
    const seedResult = await this.seedResolver.resolveWithTrace(query);
    const traversal = await this.traversalEngine.traverse(query, seedResult.seeds);
    const { rankedNodes, explanations } = this.ranker.rank(traversal.nodeStates);

    const durationMs = Date.now() - t0;

    return Object.freeze({
      query,
      seeds: seedResult.seeds,
      nodes: traversal.nodes,
      edges: traversal.edges,
      rankedNodes,
      explanations,
      metrics: {
        seedCount: seedResult.seeds.length,
        expandedNodes: traversal.expandedNodeCount,
        queriedEdges: traversal.queriedEdgeCount,
        durationMs,
        sqliteQueryCount: traversal.sqliteQueryCount,
        maxHopsReached: traversal.maxHopsReached,
        relationDistribution: traversal.relationDistribution,
        noiseFilteredCounts: traversal.noiseFilteredCounts,
        consideredRelationCounts: traversal.consideredRelationCounts,
      },
      expansionTrace: seedResult.trace,
    });
  }
}

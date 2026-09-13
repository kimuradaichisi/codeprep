import type { RepositoryEdge, RepositoryNode } from '../../../domain/ir';
import type { RepositoryKnowledgeStore } from '../persistence/RepositoryKnowledgeStore';
import { scoreEvidenceList } from './EvidenceQualityScorer';
import { getRelationPolicy } from './RelationTraversalPolicy';
import type { RepositoryTaskQuery, SubgraphSeed } from './TaskQueryDto';

export interface TraversalNodeState {
  readonly node: RepositoryNode;
  readonly score: number;
  readonly hop: number;
  readonly reasons: readonly string[];
  readonly supportingPaths: readonly string[];
}

export interface TraversalResult {
  readonly nodes: readonly RepositoryNode[];
  readonly edges: readonly RepositoryEdge[];
  readonly nodeStates: ReadonlyMap<string, TraversalNodeState>;
  readonly expandedNodeCount: number;
  readonly queriedEdgeCount: number;
  readonly sqliteQueryCount: number;
  readonly maxHopsReached: number;
  readonly relationDistribution: Readonly<Record<string, number>>;
  readonly noiseFilteredCounts: Readonly<Record<string, number>>;
  readonly consideredRelationCounts: Readonly<Record<string, number>>;
}

interface FrontierItem {
  readonly nodeId: string;
  readonly score: number;
  readonly hop: number;
}

function selectBestFrontier(frontier: FrontierItem[]): FrontierItem {
  let bestIdx = 0;
  for (let i = 1; i < frontier.length; i++) {
    if (frontier[i].score > frontier[bestIdx].score) bestIdx = i;
  }
  return frontier.splice(bestIdx, 1)[0];
}

function shouldExpandEdge(
  edge: RepositoryEdge,
  countsByRel: Map<string, number>,
  noiseFiltered: Map<string, number>
): boolean {
  const policy = getRelationPolicy(edge.relationType);
  const currentCount = countsByRel.get(edge.relationType) ?? 0;
  if (currentCount >= policy.fanoutCap) {
    noiseFiltered.set(edge.relationType, (noiseFiltered.get(edge.relationType) ?? 0) + 1);
    return false;
  }
  countsByRel.set(edge.relationType, currentCount + 1);
  return true;
}

function calculateNeighborScore(
  parentScore: number,
  edge: RepositoryEdge
): number {
  const policy = getRelationPolicy(edge.relationType);
  const evScore = scoreEvidenceList(edge.evidences);
  const raw = parentScore * policy.weight * evScore - policy.penaltyPerHop;
  return Math.max(0, Math.min(1.0, raw));
}

function createSeedState(seed: SubgraphSeed, store: RepositoryKnowledgeStore, snapshotId: string): Promise<RepositoryNode | undefined> {
  return store.findNodes({ snapshotId, path: seed.path }).then(nodes => nodes.find(n => n.id === seed.nodeId) ?? nodes[0]);
}

interface TraversalContext {
  readonly snapshotId: string;
  readonly maxNodes: number;
  readonly maxHops: number;
  readonly minScore: number;
  readonly visitedNodes: Map<string, TraversalNodeState>;
  readonly collectedEdges: Map<string, RepositoryEdge>;
  readonly relationDistribution: Record<string, number>;
  readonly noiseFilteredCounts: Map<string, number>;
  readonly consideredRelationCounts: Record<string, number>;
  readonly frontier: FrontierItem[];
  sqliteQueryCount: number;
  maxHopsReached: number;
}

async function initializeSeeds(seeds: readonly SubgraphSeed[], store: RepositoryKnowledgeStore, ctx: TraversalContext): Promise<void> {
  for (const seed of seeds) {
    ctx.sqliteQueryCount++;
    const node = await createSeedState(seed, store, ctx.snapshotId);
    if (!node) continue;
    ctx.visitedNodes.set(node.id, {
      node, score: seed.score, hop: 0,
      reasons: [`seed:${seed.matchType}(${seed.matchedText})`],
      supportingPaths: [node.path],
    });
    ctx.frontier.push({ nodeId: node.id, score: seed.score, hop: 0 });
  }
}

function processNeighborEdge(edge: RepositoryEdge, current: FrontierItem, targetNode: RepositoryNode, ctx: TraversalContext): void {
  const nextScore = calculateNeighborScore(current.score, edge);
  if (nextScore < ctx.minScore) return;

  ctx.collectedEdges.set(edge.id, edge);
  ctx.relationDistribution[edge.relationType] = (ctx.relationDistribution[edge.relationType] ?? 0) + 1;

  const nextHop = current.hop + 1;
  if (nextHop > ctx.maxHopsReached) ctx.maxHopsReached = nextHop;

  const existing = ctx.visitedNodes.get(targetNode.id);
  const parentState = ctx.visitedNodes.get(current.nodeId);
  const parentPath = parentState?.node.path ?? 'unknown';

  if (!existing || nextScore > existing.score) {
    ctx.visitedNodes.set(targetNode.id, {
      node: targetNode, score: nextScore, hop: nextHop,
      reasons: [...(parentState?.reasons ?? []), `${edge.relationType} via ${parentPath}`],
      supportingPaths: Array.from(new Set([...(parentState?.supportingPaths ?? []), targetNode.path])),
    });
    ctx.frontier.push({ nodeId: targetNode.id, score: nextScore, hop: nextHop });
  }
}

function expandNeighborEdges(edges: readonly RepositoryEdge[], targetNodes: readonly RepositoryNode[], current: FrontierItem, ctx: TraversalContext): void {
  const countsByRel = new Map<string, number>();
  for (const edge of edges) {
    ctx.consideredRelationCounts[edge.relationType] = (ctx.consideredRelationCounts[edge.relationType] ?? 0) + 1;
    if (!shouldExpandEdge(edge, countsByRel, ctx.noiseFilteredCounts)) continue;
    const target = targetNodes.find(n => n.id === edge.targetNodeId || n.id === edge.sourceNodeId);
    if (!target || target.id === current.nodeId) continue;
    processNeighborEdge(edge, current, target, ctx);
  }
}

function buildTraversalResult(ctx: TraversalContext, queriedEdgeCount: number): TraversalResult {
  const noiseMap: Record<string, number> = {};
  for (const [k, v] of ctx.noiseFilteredCounts.entries()) noiseMap[k] = v;
  return Object.freeze({
    nodes: Object.freeze(Array.from(ctx.visitedNodes.values()).map(s => s.node)),
    edges: Object.freeze(Array.from(ctx.collectedEdges.values())),
    nodeStates: ctx.visitedNodes,
    expandedNodeCount: ctx.visitedNodes.size,
    queriedEdgeCount,
    sqliteQueryCount: ctx.sqliteQueryCount,
    maxHopsReached: ctx.maxHopsReached,
    relationDistribution: Object.freeze(ctx.relationDistribution),
    noiseFilteredCounts: Object.freeze(noiseMap),
    consideredRelationCounts: Object.freeze(ctx.consideredRelationCounts),
  });
}

export class GraphTraversalEngine {
  constructor(private readonly store: RepositoryKnowledgeStore) {}

  public async traverse(query: RepositoryTaskQuery, seeds: readonly SubgraphSeed[]): Promise<TraversalResult> {
    const ctx: TraversalContext = {
      snapshotId: query.snapshotId, maxNodes: query.maxNodes ?? 30,
      maxHops: query.maxHops ?? 2, minScore: 0.15,
      visitedNodes: new Map(), collectedEdges: new Map(),
      relationDistribution: {}, noiseFilteredCounts: new Map(),
      consideredRelationCounts: {}, frontier: [],
      sqliteQueryCount: 0, maxHopsReached: 0,
    };

    await initializeSeeds(seeds, this.store, ctx);
    let queriedEdgeCount = 0;

    while (ctx.frontier.length > 0 && ctx.visitedNodes.size < ctx.maxNodes) {
      const current = selectBestFrontier(ctx.frontier);
      if (current.hop >= ctx.maxHops || current.score < ctx.minScore) continue;

      ctx.sqliteQueryCount++;
      const neighborRes = await this.store.queryNeighbors({ snapshotId: ctx.snapshotId, nodeId: current.nodeId });
      queriedEdgeCount += neighborRes.edges.length;
      expandNeighborEdges(neighborRes.edges, neighborRes.targetNodes, current, ctx);
    }

    return buildTraversalResult(ctx, queriedEdgeCount);
  }
}

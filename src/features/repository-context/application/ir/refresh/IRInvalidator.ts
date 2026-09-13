import type { RepositoryEdge, RepositoryIR, RepositoryNode } from '../../../domain/ir';
import type { ProducerPlan, RefreshPlan } from './RefreshPlan';

export interface InvalidationResult {
  readonly retainedNodes: readonly RepositoryNode[];
  readonly retainedEdges: readonly RepositoryEdge[];
  readonly removedNodeCount: number;
  readonly removedEdgeCount: number;
}

const ANALYZER_BY_PRODUCER: Record<string, string> = {
  'typescript-language': 'typescript-compiler',
  'typescript-wiring': 'typescript-manual-composition',
  'dependency-scanner': 'dependency-scanner',
  'git-cochange': 'git-cochange',
  'docgraph': 'docgraph',
};

function collectInvalidatedPaths(plan: RefreshPlan): Set<string> {
  const set = new Set<string>();
  for (const p of plan.changeSet.deleted) set.add(p);
  for (const r of plan.changeSet.renamed) set.add(r.oldPath);
  return set;
}

function shouldRetainNode(node: RepositoryNode, removedPaths: Set<string>): boolean {
  return !removedPaths.has(node.path);
}

function isEdgeFromInvalidatedProducer(
  edge: RepositoryEdge,
  producerPlans: readonly ProducerPlan[],
  nodePathMap: Map<string, string>,
): boolean {
  const sourcePath = nodePathMap.get(edge.sourceNodeId);
  for (const pp of producerPlans) {
    const analyzer = ANALYZER_BY_PRODUCER[pp.producer];
    if (!analyzer) continue;
    const hasEvidence = edge.evidences.some(ev => ev.analyzer === analyzer);
    if (!hasEvidence) continue;

    if (pp.strategy === 'PRODUCER_FULL') return true;
    if (sourcePath && pp.targetPaths.includes(sourcePath)) return true;
  }
  return false;
}

function filterRetainedNodes(
  previousIR: RepositoryIR,
  removedPaths: Set<string>,
): { retainedNodes: RepositoryNode[]; retainedNodeIds: Set<string>; nodePathMap: Map<string, string> } {
  const retainedNodes: RepositoryNode[] = [];
  const retainedNodeIds = new Set<string>();
  const nodePathMap = new Map<string, string>();
  for (const node of previousIR.nodes.values()) {
    nodePathMap.set(node.id, node.path);
    if (shouldRetainNode(node, removedPaths)) {
      retainedNodes.push(node);
      retainedNodeIds.add(node.id);
    }
  }
  return { retainedNodes, retainedNodeIds, nodePathMap };
}

function filterRetainedEdges(
  previousIR: RepositoryIR,
  plan: RefreshPlan,
  retainedNodeIds: Set<string>,
  nodePathMap: Map<string, string>,
): RepositoryEdge[] {
  const retainedEdges: RepositoryEdge[] = [];
  for (const edge of previousIR.edges) {
    if (!retainedNodeIds.has(edge.sourceNodeId) || !retainedNodeIds.has(edge.targetNodeId)) continue;
    if (isEdgeFromInvalidatedProducer(edge, plan.producerPlans, nodePathMap)) continue;
    retainedEdges.push(edge);
  }
  return retainedEdges;
}

export class IRInvalidator {
  public invalidate(previousIR: RepositoryIR, plan: RefreshPlan): InvalidationResult {
    const removedPaths = collectInvalidatedPaths(plan);
    const { retainedNodes, retainedNodeIds, nodePathMap } = filterRetainedNodes(previousIR, removedPaths);
    const retainedEdges = filterRetainedEdges(previousIR, plan, retainedNodeIds, nodePathMap);

    return Object.freeze({
      retainedNodes: Object.freeze(retainedNodes),
      retainedEdges: Object.freeze(retainedEdges),
      removedNodeCount: previousIR.nodes.size - retainedNodes.length,
      removedEdgeCount: previousIR.edges.length - retainedEdges.length,
    });
  }
}

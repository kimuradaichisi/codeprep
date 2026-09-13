import type { TraversalNodeState } from './GraphTraversalEngine';
import type { NodeQueryExplanation, RankedRelevantNode } from './TaskQueryDto';

function buildExplanation(state: TraversalNodeState): NodeQueryExplanation {
  const isSeed = state.hop === 0;
  const seedContrib = isSeed ? state.score : 0;
  const relContrib = isSeed ? 0 : state.score * 0.7;
  const evContrib = isSeed ? 0 : state.score * 0.3;
  const penalty = state.hop * 0.1;

  return {
    nodeId: state.node.id,
    path: state.node.path,
    finalScore: Number(state.score.toFixed(3)),
    seedContribution: Number(seedContrib.toFixed(3)),
    relationContribution: Number(relContrib.toFixed(3)),
    evidenceContribution: Number(evContrib.toFixed(3)),
    penalty: Number(penalty.toFixed(3)),
    traces: state.reasons,
  };
}

function buildRankedNode(state: TraversalNodeState): RankedRelevantNode {
  return {
    nodeId: state.node.id,
    path: state.node.path,
    name: state.node.name,
    kind: state.node.kind,
    score: Number(state.score.toFixed(3)),
    reasons: state.reasons,
    supportingPaths: state.supportingPaths,
  };
}

export class RelevantNodeRanker {
  public rank(nodeStates: ReadonlyMap<string, TraversalNodeState>): {
    readonly rankedNodes: readonly RankedRelevantNode[];
    readonly explanations: readonly NodeQueryExplanation[];
  } {
    const states = Array.from(nodeStates.values());
    states.sort((a, b) => b.score - a.score || a.node.path.localeCompare(b.node.path));

    const rankedNodes = states.map(buildRankedNode);
    const explanations = states.map(buildExplanation);

    return Object.freeze({
      rankedNodes: Object.freeze(rankedNodes),
      explanations: Object.freeze(explanations),
    });
  }
}

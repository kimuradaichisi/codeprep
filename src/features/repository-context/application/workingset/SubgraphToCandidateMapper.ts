// src/features/repository-context/application/workingset/SubgraphToCandidateMapper.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { RepositoryRelevantSubgraph, RankedRelevantNode } from '../ir/query/TaskQueryDto';
import type { WorkingSetCandidate } from '../../domain/workingset/WorkingSetCandidate';
import { RoleAssigner } from '../../domain/workingset/RoleAssigner';
import { CandidateClassifier } from '../../domain/workingset/CandidateClassifier';
import { estimateTokens } from '../../domain/workingset/WorkingSetBudget';

export class SubgraphToCandidateMapper {
  public static map(subgraph: RepositoryRelevantSubgraph): readonly WorkingSetCandidate[] {
    const seedIds = new Set(subgraph.seeds.map((s) => s.nodeId));
    const edgeRelations = this.indexEdgeRelations(subgraph);

    return Object.freeze(
      subgraph.rankedNodes.map((node, index) =>
        this.mapSingleNode(node, index, seedIds, edgeRelations.get(node.nodeId) ?? [])
      )
    );
  }

  private static indexEdgeRelations(subgraph: RepositoryRelevantSubgraph): Map<string, string[]> {
    const map = new Map<string, string[]>();
    for (const edge of subgraph.edges) {
      this.addEdgeRelation(map, edge.sourceNodeId, edge.relationType);
      this.addEdgeRelation(map, edge.targetNodeId, edge.relationType);
    }
    return map;
  }

  private static addEdgeRelation(map: Map<string, string[]>, id: string, rel: string): void {
    const list = map.get(id) ?? [];
    if (!list.includes(rel)) list.push(rel);
    map.set(id, list);
  }

  private static mapSingleNode(
    node: RankedRelevantNode,
    index: number,
    seedIds: Set<string>,
    relations: readonly string[]
  ): WorkingSetCandidate {
    const isSeed = seedIds.has(node.nodeId);
    const { role, tier, priority } = this.resolveClassification(node, index, isSeed, relations);
    return this.buildCandidateObject(node, isSeed, role, tier, priority);
  }

  private static resolveClassification(
    node: RankedRelevantNode,
    index: number,
    isSeed: boolean,
    relations: readonly string[]
  ): { role: ReturnType<typeof RoleAssigner.assignRole>; tier: ReturnType<typeof CandidateClassifier.classify>['tier']; priority: number } {
    const rank = index + 1;
    const role = RoleAssigner.assignRole({ path: node.path, nodeKind: node.kind, isSeed, relations, rank });
    const { tier, priority } = CandidateClassifier.classify({ isSeed, relations, score: node.score, rank, role });
    return { role, tier, priority };
  }

  private static buildCandidateObject(
    node: RankedRelevantNode,
    isSeed: boolean,
    role: ReturnType<typeof RoleAssigner.assignRole>,
    tier: ReturnType<typeof CandidateClassifier.classify>['tier'],
    priority: number
  ): WorkingSetCandidate {
    return {
      nodeId: node.nodeId,
      path: node.path,
      role,
      tier,
      score: node.score,
      priority,
      estimatedTokens: estimateTokens(1500),
      estimatedBytes: 1500,
      reasons: node.reasons,
      relationPaths: node.supportingPaths,
      provenance: isSeed ? 'explicit-seed' : 'graph',
      symbolName: node.name,
      nodeKind: node.kind,
    };
  }
}

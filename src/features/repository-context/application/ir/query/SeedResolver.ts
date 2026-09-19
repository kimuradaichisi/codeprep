// src/features/repository-context/application/ir/query/SeedResolver.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { RepositoryNode } from '../../../domain/ir';
import type { RepositoryKnowledgeStore } from '../persistence/RepositoryKnowledgeStore';
import type { RepositoryTaskQuery, SubgraphSeed } from './TaskQueryDto';
import { RepositoryVocabularyIndex } from './RepositoryVocabularyIndex';
import { DeterministicQueryExpander } from './DeterministicQueryExpander';
import { SeedScorer } from './SeedScorer';
import type { QueryExpansionTrace, QueryExpansion } from '../../../domain/ir/query/QueryExpansionModel';

export interface SeedResolutionResult {
  readonly seeds: readonly SubgraphSeed[];
  readonly trace?: QueryExpansionTrace;
}

export class SeedResolver {
  constructor(private readonly store: RepositoryKnowledgeStore) {}

  public async resolveWithTrace(query: RepositoryTaskQuery): Promise<SeedResolutionResult> {
    const maxSeeds = query.maxSeeds ?? 10;
    const explicitSeeds = query.optionalExplicitPaths && query.optionalExplicitPaths.length > 0
      ? await this.resolveExplicitSeeds(query.optionalExplicitPaths, query.snapshotId)
      : [];

    if (explicitSeeds.length >= maxSeeds) {
      return Object.freeze({ seeds: Object.freeze(explicitSeeds.slice(0, maxSeeds)) });
    }

    const vocab = await RepositoryVocabularyIndex.getOrBuild(query.snapshotId, this.store);
    const expansion = DeterministicQueryExpander.expand(query.task, vocab);
    const expansionMap = new Map<string, QueryExpansion>();
    for (const exp of expansion.trace.expansions) expansionMap.set(exp.expandedTerm.toLowerCase(), exp);

    const bestByNodeId = new Map<string, SubgraphSeed>();
    for (const seed of explicitSeeds) bestByNodeId.set(seed.nodeId, seed);

    const isDocFocused = /\b(docs?|documentation|architecture|readme|markdown|guide)\b|ドキュメント|仕様|設計書/i.test(query.task);
    await this.collectCandidateSeeds(query.snapshotId, expansion.expandedTerms, expansionMap, expansion.trace.ambiguityPenalties, bestByNodeId, isDocFocused);

    const sorted = this.sortCandidateSeeds(Array.from(bestByNodeId.values()));
    const selected = this.deduplicateSeedsByPath(sorted, maxSeeds);

    return Object.freeze({
      seeds: Object.freeze(selected),
      trace: expansion.trace,
    });
  }

  private sortCandidateSeeds(candidates: SubgraphSeed[]): SubgraphSeed[] {
    return candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aIsFile = a.matchType === 'filename';
      const bIsFile = b.matchType === 'filename';
      if (aIsFile && !bIsFile) return -1;
      if (!aIsFile && bIsFile) return 1;
      return 0;
    });
  }

  private deduplicateSeedsByPath(sorted: readonly SubgraphSeed[], maxSeeds: number): SubgraphSeed[] {
    const selected: SubgraphSeed[] = [];
    const seenPaths = new Set<string>();
    for (const seed of sorted) {
      if (selected.length >= maxSeeds) break;
      if (!seenPaths.has(seed.path)) {
        seenPaths.add(seed.path);
        selected.push(seed);
      }
    }
    return selected;
  }

  public async resolve(query: RepositoryTaskQuery): Promise<readonly SubgraphSeed[]> {
    const res = await this.resolveWithTrace(query);
    return res.seeds;
  }

  private async resolveExplicitSeeds(
    explicitPaths: readonly string[],
    snapshotId: string
  ): Promise<SubgraphSeed[]> {
    const seeds: SubgraphSeed[] = [];
    for (const p of explicitPaths) {
      const nodes = await this.store.findNodes({ snapshotId, path: p });
      for (const node of nodes) {
        seeds.push({
          nodeId: node.id,
          path: node.path,
          score: 1.0,
          matchType: 'explicit-path',
          matchedText: p,
          reason: `explicit-path(${p})`,
          expansionMethod: 'exact',
        });
      }
    }
    return seeds;
  }

  private async collectCandidateSeeds(
    snapshotId: string,
    terms: readonly string[],
    expansionMap: Map<string, QueryExpansion>,
    ambiguityPenalties: Readonly<Record<string, number>>,
    bestByNodeId: Map<string, SubgraphSeed>,
    isDocFocused: boolean
  ): Promise<void> {
    const searchPromises = terms.map(async (t) => {
      const found = await this.store.findNodes({ snapshotId, query: t, limit: 15 });
      return { term: t, nodes: found };
    });

    const searchResults = await Promise.all(searchPromises);
    for (const { term, nodes } of searchResults) {
      const exp = expansionMap.get(term.toLowerCase());
      const penalty = ambiguityPenalties[term.toLowerCase()] ?? 0;
      for (const node of nodes) {
        this.scoreAndRegisterNode(term, node, exp, penalty, bestByNodeId, isDocFocused);
      }
    }
  }

  private scoreAndRegisterNode(
    term: string,
    node: RepositoryNode,
    exp: QueryExpansion | undefined,
    penalty: number,
    bestByNodeId: Map<string, SubgraphSeed>,
    isDocFocused: boolean
  ): void {
    const decomp = SeedScorer.calculate(term, node, exp, penalty, { isDocFocused });
    const existing = bestByNodeId.get(node.id);
    if (!existing || decomp.score > existing.score) {
      bestByNodeId.set(node.id, {
        nodeId: node.id,
        path: node.path,
        score: decomp.score,
        matchType: decomp.matchType,
        matchedText: term,
        reason: decomp.reason,
        expansionMethod: exp?.method ?? 'exact',
      });
    }
  }
}

// src/features/repository-context/application/ir/query/SeedScorer.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { RepositoryNode } from '../../../domain/ir';
import type { SubgraphSeed } from './TaskQueryDto';
import type { QueryExpansion, ExpansionMethod } from '../../../domain/ir/query/QueryExpansionModel';

export interface ScoreDecomposition {
  readonly score: number;
  readonly matchType: SubgraphSeed['matchType'];
  readonly reason: string;
}

export interface SeedScorerOptions {
  readonly isDocFocused?: boolean;
}

export class SeedScorer {
  public static calculate(
    term: string,
    node: RepositoryNode,
    expansion?: QueryExpansion,
    ambiguityPenalty: number = 0,
    options?: SeedScorerOptions
  ): ScoreDecomposition {
    const normTerm = term.toLowerCase();
    const normName = node.name.toLowerCase();
    const normPath = node.path.toLowerCase();

    const match = this.determineBaseScore(term, normTerm, normName, normPath, node, options?.isDocFocused ?? false);
    const methodBonus = expansion?.scoreAdjustment ?? this.getMethodBonus(expansion?.method);
    const finalScore = Number(Math.max(0.1, Math.min(1.0, match.baseScore + methodBonus - ambiguityPenalty)).toFixed(3));
    const reason = `seed:${match.matchDesc}${methodBonus > 0 ? `+${expansion?.method ?? 'bonus'}` : ''}${ambiguityPenalty > 0 ? `-ambiguity` : ''}`;

    return Object.freeze({ score: finalScore, matchType: match.matchType, reason });
  }

  private static determineBaseScore(
    term: string,
    normTerm: string,
    normName: string,
    normPath: string,
    node: RepositoryNode,
    isDocFocused: boolean
  ): { baseScore: number; matchType: SubgraphSeed['matchType']; matchDesc: string } {
    const isTest = normPath.includes('__tests__') || normPath.includes('.test.') || node.kind === 'test';
    const isDoc = (normPath.startsWith('docs/') || normPath.endsWith('.md')) && !isDocFocused;
    const nonProdPenalty = (isTest || isDoc) ? 0.04 : 0;
    const docBonus = (isDocFocused && (normPath.startsWith('docs/') || normPath.endsWith('.md'))) ? 0.02 : 0;

    if (node.kind === 'symbol' && normName === normTerm) {
      return { baseScore: 0.96 - nonProdPenalty, matchType: 'symbol-name', matchDesc: `symbol-name(${node.name})` };
    }
    if (node.kind === 'file' && this.isExactFileName(normName, normTerm)) {
      return { baseScore: 0.96 - nonProdPenalty + docBonus, matchType: 'filename', matchDesc: `filename(${node.name})` };
    }
    if (node.kind === 'file' && this.isMatchingFilePath(normPath, normTerm)) {
      return { baseScore: 0.94 - nonProdPenalty + docBonus, matchType: 'filename', matchDesc: `filepath(${node.name})` };
    }
    if (node.kind === 'symbol' && normTerm.length >= 4) {
      return this.determineSymbolScore(normName, normTerm, node);
    }
    return this.determineDocOrPathScore(term, normTerm, normName, normPath, node);
  }

  private static isExactFileName(normName: string, normTerm: string): boolean {
    if (normName === normTerm) return true;
    return normName === `${normTerm}.ts` ||
      normName === `${normTerm}.tsx` ||
      normName === `${normTerm}.md` ||
      normName === `${normTerm}.json`;
  }

  private static isMatchingFilePath(normPath: string, normTerm: string): boolean {
    return normPath.endsWith(`/${normTerm}.ts`) ||
      normPath.endsWith(`/${normTerm}.tsx`) ||
      normPath.endsWith(`/${normTerm}.md`) ||
      normPath.endsWith(`/${normTerm}.json`);
  }

  private static determineSymbolScore(
    normName: string,
    normTerm: string,
    node: RepositoryNode
  ): { baseScore: number; matchType: SubgraphSeed['matchType']; matchDesc: string } {
    if (normName.startsWith(normTerm) || normName.endsWith(normTerm)) {
      return { baseScore: 0.88, matchType: 'symbol-name', matchDesc: `symbol-affix(${node.name})` };
    }
    if (normName.includes(normTerm)) {
      return { baseScore: 0.80, matchType: 'symbol-name', matchDesc: `symbol-partial(${node.name})` };
    }
    return { baseScore: 0.30, matchType: 'path-token', matchDesc: `token(${normTerm})` };
  }

  private static determineDocOrPathScore(
    term: string,
    normTerm: string,
    normName: string,
    normPath: string,
    node: RepositoryNode
  ): { baseScore: number; matchType: SubgraphSeed['matchType']; matchDesc: string } {
    if (node.kind === 'doc-section' && normTerm.length >= 4) {
      if (normName === normTerm) {
        return { baseScore: 0.85, matchType: 'heading', matchDesc: `heading-exact(${node.name})` };
      }
      if (normName.includes(normTerm)) {
        return { baseScore: 0.70, matchType: 'heading', matchDesc: `heading-partial(${node.name})` };
      }
    }
    if (normPath.includes(normTerm) && normTerm.length >= 3) {
      return { baseScore: 0.60, matchType: 'path-token', matchDesc: `path-token(${term})` };
    }
    return { baseScore: 0.30, matchType: 'path-token', matchDesc: `token(${term})` };
  }

  private static getMethodBonus(method?: ExpansionMethod): number {
    if (method === 'phrase') return 0.03;
    if (method === 'exact') return 0.02;
    if (method === 'term-family') return 0.01;
    return 0;
  }
}

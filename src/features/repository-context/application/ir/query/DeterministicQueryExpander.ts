// src/features/repository-context/application/ir/query/DeterministicQueryExpander.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { RepositoryVocabularyIndex, RepositoryVocabularyTerm } from './RepositoryVocabularyIndex';
import { IdentifierNormalizer } from '../../../domain/ir/query/IdentifierNormalizer';
import { QueryMorphology } from '../../../domain/ir/query/QueryMorphology';
import { PhraseMatcher } from './PhraseMatcher';
import {
  type QueryExpansion,
  type QueryExpansionTrace,
  type ExpansionBudgetConfig,
  DEFAULT_EXPANSION_BUDGET,
} from '../../../domain/ir/query/QueryExpansionModel';

export interface ExpansionResult {
  readonly expandedTerms: readonly string[];
  readonly trace: QueryExpansionTrace;
}

export class DeterministicQueryExpander {
  public static expand(
    taskText: string,
    vocab: RepositoryVocabularyIndex,
    budget: ExpansionBudgetConfig = DEFAULT_EXPANSION_BUDGET
  ): ExpansionResult {
    const rawTokens = IdentifierNormalizer.extractTokens(taskText).slice(0, budget.maxNormalizedTerms);
    const expansions: QueryExpansion[] = [];
    const expandedSet = new Set<string>();

    for (const t of rawTokens) {
      expandedSet.add(t);
      expansions.push({ sourceTerm: t, expandedTerm: t, method: 'exact', evidence: 'task-text', scoreAdjustment: 0.02 });
    }

    const phrases = this.expandPhrases(rawTokens, vocab, expandedSet, expansions);
    this.expandCompoundTermFamilies(rawTokens, vocab, budget, expandedSet, expansions);

    for (const t of rawTokens) {
      this.expandMorphologyAndFamilies(t, vocab, budget, expandedSet, expansions);
    }

    const ambiguityPenalties = this.calculateAmbiguityPenalties(expandedSet, vocab);
    const trace = this.buildTrace(rawTokens, expandedSet, phrases, expansions, ambiguityPenalties, budget.maxTotalExpandedTerms);
    const limited = Array.from(expandedSet).slice(0, budget.maxTotalExpandedTerms);

    return Object.freeze({ expandedTerms: Object.freeze(limited), trace });
  }

  private static expandPhrases(
    rawTokens: readonly string[],
    vocab: RepositoryVocabularyIndex,
    expandedSet: Set<string>,
    expansions: QueryExpansion[]
  ): readonly string[] {
    const matchedPhrases = PhraseMatcher.matchPhrases(rawTokens, vocab);
    for (const p of matchedPhrases) {
      for (const term of p.matchedTerms) {
        if (!expandedSet.has(term.raw)) {
          expandedSet.add(term.raw);
          expansions.push({ sourceTerm: p.phrase, expandedTerm: term.raw, method: 'phrase', evidence: `matched-phrase(${p.phrase})`, scoreAdjustment: 0.01 });
        }
      }
    }
    return matchedPhrases.map(p => p.phrase);
  }

  private static calculateAmbiguityPenalties(
    expandedSet: Set<string>,
    vocab: RepositoryVocabularyIndex
  ): Record<string, number> {
    const penalties: Record<string, number> = {};
    for (const term of expandedSet) {
      const freq = vocab.getTermFrequency(term);
      if (freq > 20) {
        penalties[term] = Number(Math.min(0.3, 0.05 * Math.log2(freq / 10)).toFixed(3));
      }
    }
    return penalties;
  }

  private static buildTrace(
    rawTokens: readonly string[],
    expandedSet: Set<string>,
    phrases: readonly string[],
    expansions: readonly QueryExpansion[],
    ambiguityPenalties: Record<string, number>,
    maxTotalExpandedTerms: number
  ): QueryExpansionTrace {
    return {
      originalTerms: Object.freeze(rawTokens),
      normalizedTerms: Object.freeze(Array.from(expandedSet)),
      phrases: Object.freeze(phrases),
      expansions: Object.freeze(expansions),
      candidateCount: expandedSet.size,
      selectedCount: Math.min(expandedSet.size, maxTotalExpandedTerms),
      ambiguityPenalties: Object.freeze(ambiguityPenalties),
    };
  }

  private static expandMorphologyAndFamilies(
    token: string,
    vocab: RepositoryVocabularyIndex,
    budget: ExpansionBudgetConfig,
    expandedSet: Set<string>,
    expansions: QueryExpansion[]
  ): void {
    const stem = QueryMorphology.stem(token);
    const relatedTerms = vocab.findByStem(stem);
    let count = 0;

    for (const term of relatedTerms) {
      if (count >= budget.maxExpansionsPerTerm) break;
      if (expandedSet.has(term.raw) || term.raw.length <= 2) continue;

      if (token.length >= 4 && QueryMorphology.isMorphologicallyRelated(token, term.raw)) {
        expandedSet.add(term.raw);
        expansions.push({
          sourceTerm: token,
          expandedTerm: term.raw,
          method: 'morphology',
          evidence: `stem(${stem})`,
          scoreAdjustment: -0.06,
        });
        count++;
      }
    }
  }

  private static expandCompoundTermFamilies(
    rawTokens: readonly string[],
    vocab: RepositoryVocabularyIndex,
    budget: ExpansionBudgetConfig,
    expandedSet: Set<string>,
    expansions: QueryExpansion[]
  ): void {
    const taskLowerTokens = new Set(rawTokens.map(t => t.toLowerCase()));
    const taskStemTokens = new Set(rawTokens.map(t => QueryMorphology.stem(t)));
    const candidates = this.filterCandidateCompoundTerms(vocab.allTerms, taskLowerTokens, taskStemTokens);
    let added = 0;
    const maxCompound = Math.min(35, budget.maxTotalExpandedTerms - expandedSet.size);

    for (const c of candidates) {
      if (added >= maxCompound) break;
      if (!expandedSet.has(c.term.raw)) {
        this.addCompoundExpansion(c, expandedSet, expansions);
        added++;
      }
    }
  }

  private static addCompoundExpansion(
    c: { term: RepositoryVocabularyTerm; coverage: number; matchedTokens: string[] },
    expandedSet: Set<string>,
    expansions: QueryExpansion[]
  ): void {
    expandedSet.add(c.term.raw);
    const scoreAdj = c.coverage >= 0.99
      ? (c.matchedTokens.length >= 3 ? 0.04 : 0.03)
      : Number((0.01 - 0.05 * (1.0 - c.coverage)).toFixed(3));
    expansions.push({
      sourceTerm: c.matchedTokens.join(' '),
      expandedTerm: c.term.raw,
      method: 'term-family',
      evidence: `compound-coverage(${(c.coverage * 100).toFixed(0)}%,matched=${c.matchedTokens.length})`,
      scoreAdjustment: scoreAdj,
    });
  }

  private static filterCandidateCompoundTerms(
    allTerms: readonly RepositoryVocabularyTerm[],
    taskTokens: Set<string>,
    taskStems: Set<string>
  ): Array<{ term: RepositoryVocabularyTerm; coverage: number; matchedTokens: string[] }> {
    const candidates: Array<{ term: RepositoryVocabularyTerm; coverage: number; matchedTokens: string[] }> = [];
    const seenBases = new Set<string>();

    for (const term of allTerms) {
      if (term.tokens.length < 2 || this.isSubMemberSymbol(term.raw)) continue;
      const baseName = this.getBaseIdentifier(term.raw);
      if (seenBases.has(baseName)) continue;

      const matched = term.tokens.filter(t => taskTokens.has(t.toLowerCase()) || taskStems.has(QueryMorphology.stem(t)));
      const coverage = matched.length / term.tokens.length;
      if (coverage >= 0.6 && matched.length >= 2) {
        seenBases.add(baseName);
        candidates.push({ term, coverage, matchedTokens: matched });
      }
    }

    return candidates.sort((a, b) => b.coverage - a.coverage || b.term.tokens.length - a.term.tokens.length);
  }

  private static isSubMemberSymbol(raw: string): boolean {
    const dotIdx = raw.indexOf('.');
    if (dotIdx < 0) return false;
    const ext = raw.slice(dotIdx).toLowerCase();
    return ext !== '.ts' && ext !== '.tsx' && ext !== '.md' && ext !== '.json';
  }

  private static getBaseIdentifier(raw: string): string {
    return raw.replace(/\.[a-zA-Z0-9]+$/, '').toLowerCase();
  }
}

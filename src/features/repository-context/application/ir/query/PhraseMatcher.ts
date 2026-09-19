// src/features/repository-context/application/ir/query/PhraseMatcher.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { RepositoryVocabularyIndex, RepositoryVocabularyTerm } from './RepositoryVocabularyIndex';

export interface MatchedPhrase {
  readonly phrase: string;
  readonly tokens: readonly string[];
  readonly matchedTerms: readonly RepositoryVocabularyTerm[];
}

export class PhraseMatcher {
  public static extractPhrases(tokens: readonly string[]): readonly string[] {
    const phrases: string[] = [];
    if (tokens.length < 2) return Object.freeze(phrases);

    // 2-token phrases
    for (let i = 0; i < tokens.length - 1; i++) {
      phrases.push(`${tokens[i]} ${tokens[i + 1]}`);
      phrases.push(`${tokens[i]}${tokens[i + 1]}`);
      phrases.push(`${tokens[i]}-${tokens[i + 1]}`);
    }

    // 3-token phrases
    for (let i = 0; i < tokens.length - 2; i++) {
      phrases.push(`${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`);
      phrases.push(`${tokens[i]}${tokens[i + 1]}${tokens[i + 2]}`);
      phrases.push(`${tokens[i]}-${tokens[i + 1]}-${tokens[i + 2]}`);
    }

    return Object.freeze(Array.from(new Set(phrases)));
  }

  public static matchPhrases(
    tokens: readonly string[],
    vocab: RepositoryVocabularyIndex
  ): readonly MatchedPhrase[] {
    const candidatePhrases = this.extractPhrases(tokens);
    const results: MatchedPhrase[] = [];

    for (const phrase of candidatePhrases) {
      const term = this.findMatchedTerm(phrase, vocab);
      if (term) {
        results.push({
          phrase,
          tokens: Object.freeze(phrase.split(/\s+/)),
          matchedTerms: Object.freeze([term]),
        });
      }
    }

    return Object.freeze(results);
  }

  private static findMatchedTerm(
    phrase: string,
    vocab: RepositoryVocabularyIndex
  ): RepositoryVocabularyTerm | undefined {
    const exact = vocab.findExact(phrase);
    if (exact) return exact;
    const cleanJoined = phrase.replace(/\s+/g, '');
    const cleanExact = vocab.findExact(cleanJoined);
    if (cleanExact) return cleanExact;
    const hyphenJoined = phrase.replace(/\s+/g, '-');
    return vocab.findExact(hyphenJoined);
  }
}

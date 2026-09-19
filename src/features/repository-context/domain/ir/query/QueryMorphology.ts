// src/features/repository-context/domain/ir/query/QueryMorphology.ts
/*
 * Copyright 2026 CodePrep Contributors
 */

export class QueryMorphology {
  private static readonly SUFFIX_RULES: readonly { readonly suffix: string; readonly minLength: number }[] = [
    { suffix: 'izations', minLength: 9 },
    { suffix: 'ization', minLength: 8 },
    { suffix: 'ications', minLength: 9 },
    { suffix: 'ication', minLength: 8 },
    { suffix: 'ments', minLength: 6 },
    { suffix: 'ment', minLength: 5 },
    { suffix: 'abilities', minLength: 8 },
    { suffix: 'ability', minLength: 7 },
    { suffix: 'ables', minLength: 6 },
    { suffix: 'able', minLength: 5 },
    { suffix: 'ibles', minLength: 6 },
    { suffix: 'ible', minLength: 5 },
    { suffix: 'ences', minLength: 6 },
    { suffix: 'ence', minLength: 5 },
    { suffix: 'ances', minLength: 6 },
    { suffix: 'ance', minLength: 5 },
    { suffix: 'ents', minLength: 5 },
    { suffix: 'ent', minLength: 4 },
    { suffix: 'ants', minLength: 5 },
    { suffix: 'ant', minLength: 4 },
    { suffix: 'ings', minLength: 5 },
    { suffix: 'ing', minLength: 4 },
    { suffix: 'ers', minLength: 4 },
    { suffix: 'er', minLength: 4 },
    { suffix: 'ors', minLength: 4 },
    { suffix: 'or', minLength: 4 },
    { suffix: 'ions', minLength: 5 },
    { suffix: 'ion', minLength: 4 },
    { suffix: 'ies', minLength: 4 },
    { suffix: 'ed', minLength: 4 },
    { suffix: 'es', minLength: 4 },
    { suffix: 's', minLength: 4 },
  ];

  public static stem(word: string): string {
    const lower = word.toLowerCase().trim();
    if (lower.length <= 3) return lower;

    // analysis -> analy
    if (lower.endsWith('ysis') && lower.length >= 6) {
      return lower.slice(0, -4) + 'y';
    }

    for (const { suffix, minLength } of this.SUFFIX_RULES) {
      if (lower.endsWith(suffix) && lower.length >= minLength) {
        const stemmed = lower.slice(0, -suffix.length);
        return this.repairStem(stemmed, lower);
      }
    }
    return lower;
  }

  private static repairStem(stem: string, original: string): string {
    // 重複子音の整理: mapping -> mapp -> map
    if (stem.length >= 3 && stem[stem.length - 1] === stem[stem.length - 2]) {
      return stem.slice(0, -1);
    }
    // y 変化: dependencies -> dependenc -> depend
    if (original.endsWith('ies') && stem.endsWith('c')) {
      return stem.slice(0, -1) + 't';
    }
    return stem;
  }

  public static isMorphologicallyRelated(wordA: string, wordB: string): boolean {
    const stemA = this.stem(wordA);
    const stemB = this.stem(wordB);
    if (stemA.length < 3 || stemB.length < 3) return false;
    return stemA === stemB || stemA.startsWith(stemB) || stemB.startsWith(stemA);
  }
}

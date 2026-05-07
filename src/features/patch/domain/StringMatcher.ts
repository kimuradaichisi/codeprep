/*
 * Copyright 2026 CodePrep Contributors
 */
export class StringMatcher {
  public static normalize(text: string | undefined | null): string {
    return (text || '').trim().replace(/\s+/g, '');
  }

  public static levenshtein(s1: string, s2: string): number {
    const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
    for (let i = 0; i <= s1.length; i++) track[0][i] = i;
    for (let j = 0; j <= s2.length; j++) track[j][0] = j;
    for (let j = 1; j <= s2.length; j++) {
      for (let i = 1; i <= s1.length; i++) {
        const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(track[j][i - 1] + 1, track[j - 1][i] + 1, track[j - 1][i - 1] + indicator);
      }
    }
    return track[s2.length][s1.length];
  }

  public static calculateSimilarity(s1: string, s2: string): number {
    const n1 = this.normalize(s1), n2 = this.normalize(s2);
    const longer = n1.length > n2.length ? n1 : n2;
    if (longer.length === 0) return 1.0;
    return (longer.length - this.levenshtein(n1, n2)) / longer.length;
  }
}
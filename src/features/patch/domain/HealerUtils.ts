// src/features/patch/domain/HealerUtils.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import { StringMatcher } from './StringMatcher';

export class HealerUtils {
  public static isOmitLine(line: string): boolean {
    const l = line.trim();
    const hasOmitSign = /(\.\.\.|existing|既存|省略|rest of)/i.test(l);
    const isComment = /^(?:\/\/|#|--|<!--|\/\*)/.test(l) || l.endsWith('*/') || l.endsWith('-->');
    return (isComment && hasOmitSign) || l === '...';
  }

  public static calculateSimilarity(s1: string, s2: string): number {
    return StringMatcher.calculateSimilarity(s1, s2);
  }

  public static normalize(s: string): string {
    // 比較用：記号を保持し、空白のみを削除する
    return s.trim().toLowerCase().replace(/\s+/g, '');
  }
}
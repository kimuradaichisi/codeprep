/*
 * Copyright 2026 CodePrep Contributors
 */
import { ISkeletonCompressor } from '../../domain/ISkeletonCompressor';

/**
 * 特定のパーサーがない言語向けの汎用圧縮機
 * 正規表現を使用して関数の中身（中括弧内）を置換する
 */
export class GenericCompressor implements ISkeletonCompressor {
  public readonly extensions: string[] = ['*']; // フォールバック用

  public compress(code: string): string {
    if (!code) return '';
    
    // 簡易的な実装: 複数行にわたる { ... } を検索し、中身を置換
    // 注: 完璧なパースではないが、汎用的なトークン削減には寄与する
    return code.replace(/\{[\s\S]*?\}/g, (match) => {
      // 1行以下の短いブロックは無視（プロパティや1行関数）
      if (match.split('\n').length <= 2) return match;
      return '{\n  // ... existing code ...\n}';
    });
  }
}
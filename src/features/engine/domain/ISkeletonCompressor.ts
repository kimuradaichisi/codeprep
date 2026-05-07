/*
 * Copyright 2026 CodePrep Contributors
 */

/**
 * 言語別のスケルトン圧縮（実装の省略）を定義するインターフェース
 */
export interface ISkeletonCompressor {
  /** 対応する拡張子のリスト（例: ['.ts', '.js']） */
  readonly extensions: string[];

  /**
   * ソースコードの実装部分を削り、シグネチャのみを残す
   * @param code オリジナルのソースコード
   * @returns 圧縮されたスケルトンコード
   */
  compress(code: string): string;
}
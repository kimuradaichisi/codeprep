import { TokenCount } from './TokenCount';

/**
 * 複数ファイルの統計情報を表すドメインモデル
 */
export class TokenStatistics {
  constructor(
    public readonly fileCount: number,
    public readonly totalCharacters: number
  ) {}

  /**
   * 推定トークン数を計算する（4文字 = 1トークンの簡易ロジック）
   */
  public get estimatedTokens(): TokenCount {
    const tokens = Math.ceil(this.totalCharacters / 4);
    return new TokenCount(tokens);
  }

  /**
   * ファイル情報の配列から統計を生成する
   */
  public static fromFiles(files: { size: number }[]): TokenStatistics {
    const totalChars = files.reduce((sum, f) => sum + f.size, 0);
    return new TokenStatistics(files.length, totalChars);
  }
}

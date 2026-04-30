/**
 * トークン数を表す値オブジェクト
 */
export class TokenCount {
  constructor(public readonly value: number) {
    if (value < 0) {
      throw new Error('トークン数は0以上である必要があります');
    }
  }

  /**
   * 人間が読みやすい形式（k表示など）に変換する
   */
  public toString(): string {
    if (this.value >= 1000) {
      return `${(this.value / 1000).toFixed(1)}k`;
    }
    return this.value.toString();
  }

  /**
   * 制限を超えているかどうかを判定する
   */
  public isExceeding(limit: number): boolean {
    return this.value > limit;
  }
}

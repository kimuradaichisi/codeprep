/**
 * プロンプトのテンプレートを表す値オブジェクト
 */
export class PromptTemplate {
  constructor(
    public readonly name: string,
    public readonly content: string
  ) {
    if (!name.trim()) {
      throw new Error('プロンプト名は空にできません');
    }
  }

  /**
   * プロンプトが空かどうかを判定する
   */
  public get isEmpty(): boolean {
    return !this.content.trim();
  }

  /**
   * プレビュー用の短い文字列を取得する
   */
  public get summary(): string {
    return this.content.length > 50 
      ? this.content.substring(0, 47) + '...'
      : this.content;
  }
}

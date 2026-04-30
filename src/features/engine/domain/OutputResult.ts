/**
 * エンジンによる出力結果を表すドメインモデル
 */
export class OutputResult {
  constructor(
    public readonly content: string,
    public readonly format: 'markdown' | 'xml' | 'json'
  ) {}

  /**
   * クリップボードにコピー可能な形式のテキストを取得する
   */
  public toClipboardText(): string {
    return this.content;
  }

  /**
   * プレビュー表示用のタイトルを取得する
   */
  public get previewTitle(): string {
    return `CodePrep Output (${this.format.toUpperCase()})`;
  }
}

export interface ISearchRepository {
  /**
   * ワークスペース内を検索し、マッチしたファイルの相対パス一覧を返す
   */
  search(query: string): Promise<string[]>;
}
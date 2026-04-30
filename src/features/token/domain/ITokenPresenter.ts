import { TokenStatistics } from './TokenStatistics';

/**
 * トークン統計の表示を担当するインターフェース
 */
export interface ITokenPresenter {
  /**
   * 統計情報を画面（ステータスバー等）に表示する
   */
  present(stats: TokenStatistics, limit: number): void;

  /**
   * 表示をクリアする
   */
  clear(): void;
}

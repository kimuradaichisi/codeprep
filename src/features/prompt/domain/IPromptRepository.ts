import { PromptCollection } from './PromptCollection';

/**
 * プロンプトの永続化を担うインターフェース
 */
export interface IPromptRepository {
  /**
   * すべてのプロンプトをロードする
   */
  loadAll(): Promise<PromptCollection>;

  /**
   * プロンプトを保存する
   */
  saveAll(collection: PromptCollection): Promise<void>;
}

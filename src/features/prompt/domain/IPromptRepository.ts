import { PromptCollection } from './PromptCollection';

/**
 * プロンプトの永続化を担当するインターフェース
 */
export interface IPromptRepository {
  /**
   * すべてのプロンプトを読み込む
   */
  loadAll(): Promise<PromptCollection>;

  /**
   * プロンプトを保存する
   */
  saveAll(collection: PromptCollection): Promise<void>;

  /**
   * 自動注入用のパッチ指示プロンプトを取得する
   */
  getPatchInjectionPrompt(): string;

  /**
   * パッチ指示を常に付与する設定が有効かどうかを確認する
   */
  shouldAlwaysAddPatchInstructions(): Promise<boolean>;
}

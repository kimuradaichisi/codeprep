import { IPromptRepository } from '../domain/IPromptRepository';
import { PromptCollection } from '../domain/PromptCollection';
import { PromptTemplate } from '../domain/PromptTemplate';

/**
 * プロンプトに関するユースケースを担当するクラス
 */
export class PromptUseCase {
  private selectedPromptName: string | undefined;

  constructor(private repository: IPromptRepository) {}

  /**
   * 選択されているプロンプト名を取得する
   */
  public getSelectedPrompt(): string | undefined {
    return this.selectedPromptName;
  }

  /**
   * プロンプトを選択する
   */
  public selectPrompt(name: string | undefined): void {
    this.selectedPromptName = name;
  }

  /**
   * 利用可能なすべてのプロンプトを取得する
   */
  public async getAvailablePrompts(): Promise<PromptCollection> {
    return await this.repository.loadAll();
  }

  /**
   * 新しいプロンプトをインポート（マージ）して保存する
   * @param newPromptsRecord インポートするプロンプト
   */
  public async importPrompts(newPromptsRecord: Record<string, string>): Promise<void> {
    const currentCollection = await this.repository.loadAll();
    const newCollection = PromptCollection.fromRecord(newPromptsRecord);
    
    currentCollection.merge(newCollection);
    
    await this.repository.saveAll(currentCollection);
  }

  /**
   * 指定した名前のプロンプトの内容を取得する
   */
  public async getPromptContent(name: string): Promise<string | undefined> {
    const collection = await this.repository.loadAll();
    return collection.findByName(name)?.content;
  }
}

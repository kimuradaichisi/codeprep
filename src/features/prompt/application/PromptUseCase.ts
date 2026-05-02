import { IPromptRepository } from '../domain/IPromptRepository';
import { PromptCollection } from '../domain/PromptCollection';
import { PromptProcessor } from './PromptProcessor';

/**
 * プロンプトに関するユースケースを担当するクラス
 */
export class PromptUseCase {
  private selectedPromptName: string | undefined;
  private readonly processor: PromptProcessor;

  constructor(private repository: IPromptRepository) {
    this.processor = new PromptProcessor();
  }

  public getSelectedPrompt(): string | undefined {
    return this.selectedPromptName;
  }

  public selectPrompt(name: string | undefined): void {
    this.selectedPromptName = name;
  }

  public async getAvailablePrompts(): Promise<PromptCollection> {
    return await this.repository.loadAll();
  }

  public async importPrompts(newPromptsRecord: Record<string, string>): Promise<void> {
    const currentCollection = await this.repository.loadAll();
    const newCollection = PromptCollection.fromRecord(newPromptsRecord);
    currentCollection.merge(newCollection);
    await this.repository.saveAll(currentCollection);
  }

  /**
   * プロンプト内容を取得し、変数を置換する
   */
  public async getPromptContent(
    name: string,
    context?: { language?: string; files: string[] }
  ): Promise<string | undefined> {
    const collection = await this.repository.loadAll();
    const content = collection.findByName(name)?.content;
    return content && context ? this.processor.process(content, context) : content;
  }

  public async deletePrompt(name: string): Promise<void> {
    const collection = await this.repository.loadAll();
    collection.remove(name);
    await this.repository.saveAll(collection);
    if (this.selectedPromptName === name) {
      this.selectedPromptName = undefined;
    }
  }
}

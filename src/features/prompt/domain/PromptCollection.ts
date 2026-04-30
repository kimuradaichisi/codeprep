import { PromptTemplate } from './PromptTemplate';

/**
 * プロンプトテンプレートの集合を管理するドメインモデル
 */
export class PromptCollection {
  private templates: Map<string, PromptTemplate> = new Map();

  constructor(templates: PromptTemplate[] = []) {
    templates.forEach(t => this.templates.set(t.name, t));
  }

  public get all(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  public get names(): string[] {
    return Array.from(this.templates.keys());
  }

  public findByName(name: string): PromptTemplate | undefined {
    return this.templates.get(name);
  }

  /**
   * 新しいプロンプトをマージする。同名のものは上書きされる。
   * @param other 他のプロンプト集合
   */
  public merge(other: PromptCollection): void {
    other.all.forEach(t => this.templates.set(t.name, t));
  }

  /**
   * 名前と内容のレコード形式からコレクションを生成する
   */
  public static fromRecord(record: Record<string, string>): PromptCollection {
    const templates = Object.entries(record).map(
      ([name, content]) => new PromptTemplate(name, content)
    );
    return new PromptCollection(templates);
  }

  /**
   * レコード形式に変換する（保存用）
   */
  public toRecord(): Record<string, string> {
    const record: Record<string, string> = {};
    this.templates.forEach((t, name) => {
      record[name] = t.content;
    });
    return record;
  }
}

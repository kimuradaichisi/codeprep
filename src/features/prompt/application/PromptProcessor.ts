import { generateTree } from '../../../utils/treeGenerator';

/**
 * プロンプトテンプレート内の変数を置換するドメインサービス。
 */
export class PromptProcessor {
  /**
   * テンプレート内の変数を実際の値で置換する。
   * 
   * @param template プロンプトテンプレート
   * @param context 置換に使用するコンテキスト情報
   * @returns 置換後のプロンプト
   */
  public process(template: string, context: { language?: string; files: string[] }): string {
    let result = template;
    result = this.replaceLanguage(result, context.language);
    result = this.replaceDateTime(result);
    result = this.replaceTree(result, context.files);
    return result;
  }

  private replaceLanguage(template: string, language?: string): string {
    return language ? template.replace(/{{language}}/g, language) : template;
  }

  private replaceDateTime(template: string): string {
    return template.replace(/{{datetime}}/g, new Date().toLocaleString());
  }

  private replaceTree(template: string, files: string[]): string {
    if (files.length === 0) return template;
    return template.replace(/{{tree}}/g, generateTree(files));
  }

}

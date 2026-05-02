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
  public process(
    template: string,
    context: {
      language?: string;
      files: string[];
    }
  ): string {
    let result = template;
    
    // {{language}} - 表示言語など
    if (context.language) {
      result = result.replace(/{{language}}/g, context.language);
    }
    
    // {{datetime}} - 現在の日時
    const now = new Date().toLocaleString();
    result = result.replace(/{{datetime}}/g, now);
    
    // {{tree}} - 選択されたファイルのディレクトリ構造
    if (context.files.length > 0) {
      const tree = generateTree(context.files);
      result = result.replace(/{{tree}}/g, tree);
    }
    
    return result;
  }
}

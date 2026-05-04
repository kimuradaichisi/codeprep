/**
 * プレビュー用のパッチ内容を一時的に保持するキャッシュ
 * URI の長さ制限やエンコード問題を回避するために使用する
 */
export class PatchCache {
  private static cache = new Map<string, string>();

  public static set(id: string, content: string): void {
    this.cache.set(id, content);
  }

  public static get(id: string): string {
    return this.cache.get(id) || '';
  }

  public static generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

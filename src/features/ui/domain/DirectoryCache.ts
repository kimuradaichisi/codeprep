/*
 * Copyright 2026 CodePrep Contributors
 */

/**
 * ディレクトリ走査結果のインメモリキャッシュ。
 * リモートファイルシステム（WSL/SSH等）におけるレイテンシを削減します。
 */
export class DirectoryCache {
  private readonly cache = new Map<string, [string, boolean][]>();

  public get(folderPath: string): [string, boolean][] | undefined {
    return this.cache.get(folderPath);
  }

  public set(folderPath: string, entries: [string, boolean][]): void {
    this.cache.set(folderPath, entries);
  }

  public has(folderPath: string): boolean {
    return this.cache.has(folderPath);
  }

  public clear(folderPath?: string): void {
    if (folderPath) {
      this.cache.delete(folderPath);
    } else {
      this.cache.clear();
    }
  }

  public get size(): number {
    return this.cache.size;
  }
}

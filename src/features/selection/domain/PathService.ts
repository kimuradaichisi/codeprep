export class PathService {
  public static deriveAllPaths(files: string[]): string[] {
    const result = new Set<string>();
    // 1. まずファイル自体をすべて登録
    for (const file of files) {
      result.add(file);
    }

    // 2. 登録されたファイルから親を1回だけ辿る（重複計算を極限まで減らす）
    for (const file of files) {
      const parts = file.split('/');
      while (parts.length > 1) {
        parts.pop();
        const parent = parts.join('/');
        if (result.has(parent)) break; // すでに登録済みなら、その親も登録済みのはず
        result.add(parent);
      }
    }
    return Array.from(result);
  }
}
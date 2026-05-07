/**
 * ファイルの選択状態を管理するドメインモデル
 */
export class Selection {
  private selectedPaths: Set<string> = new Set();

  constructor(initialPaths: string[] = []) {
    this.addAll(initialPaths);
  }

  public set(path: string, isSelected: boolean): void {
    if (isSelected) {
      this.selectedPaths.add(path);
    } else {
      this.selectedPaths.delete(path);
    }
  }

  public setMany(paths: string[], checked: boolean): void {
    for (const p of paths) {
      if (checked) {
        this.selectedPaths.add(p);
      } else {
        this.selectedPaths.delete(p);
      }
    }
  }

  public addAll(paths: string[]): void {
    // Set.add は O(1) だが、ループ回数を減らすために
    // 配列のサイズが大きい場合はチャンク処理を検討する
    for (let i = 0; i < paths.length; i++) {
      this.selectedPaths.add(paths[i]);
    }
  }

  // 内部の状態を直接書き換える高速版
  public replaceAll(newPaths: Set<string>): void {
    this.selectedPaths = newPaths;
  }

  public clear(): void {
    this.selectedPaths.clear();
  }

  public invert(allPaths: string[]): void {
    const nextSelection = new Set<string>();
    allPaths.forEach((p) => {
      if (!this.selectedPaths.has(p)) {
        nextSelection.add(p);
      }
    });
    this.selectedPaths = nextSelection;
  }

  public getPaths(): string[] {
    return Array.from(this.selectedPaths);
  }

  public has(path: string): boolean {
    return this.selectedPaths.has(path);
  }

  public get count(): number {
    return this.selectedPaths.size;
  }
}

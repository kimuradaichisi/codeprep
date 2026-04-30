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

  public addAll(paths: string[]): void {
    paths.forEach((p) => this.selectedPaths.add(p));
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

/**
 * 選択状態の永続化を担うリポジトリインターフェース
 */
export interface ISelectionRepository {
  savePaths(name: string, paths: string[]): Promise<void>;
  loadPaths(name: string): Promise<string[] | undefined>;
  getPresetList(): string[];
  addToPresetList(name: string): Promise<void>;
}

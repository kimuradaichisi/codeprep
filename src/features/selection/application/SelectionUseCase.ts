import { Selection } from '../domain/Selection';
import { ISelectionRepository } from '../domain/ISelectionRepository';
import { IFileValidator } from '../domain/IFileValidator';

/**
 * 選択操作のユースケース
 */
export class SelectionUseCase {
  constructor(
    private selection: Selection,
    private repository: ISelectionRepository,
    private validator: IFileValidator
  ) {}

  public async savePreset(name: string): Promise<void> {
    const paths = this.selection.getPaths();
    await this.repository.savePaths(name, paths);
    await this.repository.addToPresetList(name);
  }

  public async loadPreset(name: string): Promise<boolean> {
    const paths = await this.repository.loadPaths(name);
    if (!paths) return false;

    this.selection.clear();
    await this.addValidPaths(paths);
    return true;
  }

  public async selectAll(workspaceRepository: { getAllFiles(): Promise<string[]> }): Promise<void> {
    const allFiles = await workspaceRepository.getAllFiles();
    this.selection.clear();
    this.selection.addAll(allFiles);
  }

  public async invertSelection(workspaceRepository: { getAllFiles(): Promise<string[]> }): Promise<void> {
    const allFiles = await workspaceRepository.getAllFiles();
    this.selection.invert(allFiles);
  }

  public async selectModifiedFiles(gitUtils: { getModifiedFiles(root: string): Promise<string[]> }, root: string): Promise<void> {
    const modifiedFiles = await gitUtils.getModifiedFiles(root);
    this.selection.clear();
    this.selection.addAll(modifiedFiles);
  }

  private async addValidPaths(paths: string[]): Promise<void> {
    const results = await Promise.all(
      paths.map(async (p) => ({
        path: p,
        isValid: (await this.validator.exists(p)) && !this.validator.isExcluded(p),
      }))
    );

    results
      .filter((r) => r.isValid)
      .forEach((r) => this.selection.set(r.path, true));
  }
}

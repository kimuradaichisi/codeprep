import { Selection } from '../domain/Selection';
import { ISelectionRepository } from '../domain/ISelectionRepository';
import { IFileValidator } from '../domain/IFileValidator';
import * as path from 'path';
import { normalizePath } from '../../../utils/path';

/**
 * 選択操作のユースケース
 */
export class SelectionUseCase {
  constructor(
    private selection: Selection,
    private repository: ISelectionRepository,
    private validator: IFileValidator
  ) {}

  public get currentSelection(): Selection {
    return this.selection;
  }

  public getPresetList(): string[] {
    return this.repository.getPresetList();
  }

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
    const allPaths = this.deriveAllPaths(allFiles);
    
    this.selection.clear();
    this.selection.addAll(allPaths);
  }

  public async invertSelection(workspaceRepository: { getAllFiles(): Promise<string[]> }): Promise<void> {
    const allFiles = await workspaceRepository.getAllFiles();
    const allPaths = this.deriveAllPaths(allFiles);
    this.selection.invert(allPaths);
  }

  /**
   * ファイル一覧からすべての親ディレクトリを含むパス一覧を導出する
   */
  private deriveAllPaths(files: string[]): string[] {
    const result = new Set<string>();
    const seenDirs = new Set<string>();
    for (const file of files) {
      result.add(file);
      let parent = path.dirname(file).replace(/\\/g, '/');
      while (parent !== '.' && parent !== '/' && parent !== '' && !seenDirs.has(parent)) {
        result.add(parent);
        seenDirs.add(parent);
        parent = path.dirname(parent).replace(/\\/g, '/');
      }
    }
    return Array.from(result);
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

  /**
   * ディレクトリとその配下のすべてのファイルの選択状態を更新する
   */
  public async updateDirectorySelection(
    repository: { getFilesUnder(path: string): Promise<string[]> },
    relativePath: string,
    checked: boolean
  ): Promise<void> {
    const normPath = normalizePath(relativePath);
    
    // まず自身を確実に更新（即座にチェックを反映させるため）
    this.selection.set(normPath, checked);

    const files = await repository.getFilesUnder(normPath);
    // すべての取得パスを正規化
    const allPaths = this.deriveAllPaths(files).map(p => normalizePath(p));
    
    // 対象ディレクトリ配下のパスのみを選択状態に反映
    const targetPaths = allPaths.filter(p => 
      p === normPath || p.startsWith(normPath + '/')
    );
    
    this.selection.setMany(targetPaths, checked);
  }
}

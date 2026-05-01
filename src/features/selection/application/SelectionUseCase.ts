import { Selection } from '../domain/Selection';
import { ISelectionRepository } from '../domain/ISelectionRepository';
import { IFileValidator } from '../domain/IFileValidator';
import * as path from 'path';
import { normalizePath } from '../../../utils/path';

/**
 * Git操作に必要なインターフェース定義
 */
interface IGitUtils {
  getModifiedFiles(root: string): Promise<string[]>;
  findRelatedTests(root: string, modifiedFiles: string[]): Promise<string[]>;
}

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
      // 1. 最初に一度だけ正規化
      const normFile = normalizePath(file);
      if (!normFile || normFile === '.' || normFile === '/') continue;
      
      result.add(normFile);
      
      // 2. 親ディレクトリの導出ループ
      let parent = path.dirname(normFile);
      
      // path.dirname は既にスラッシュを扱えるため、ループ内での replace を廃止
      while (parent !== '.' && parent !== '/' && parent !== '' && !seenDirs.has(parent)) {
        result.add(parent);
        seenDirs.add(parent);
        parent = path.dirname(parent);
      }
    }
    return Array.from(result);
  }

  /**
   * Gitで変更されたファイルを選択する
   */
  public async selectModifiedFiles(
    gitUtils: IGitUtils, 
    root: string, 
    includeTests: boolean = false
  ): Promise<void> {
    const modifiedFiles = await gitUtils.getModifiedFiles(root);
    if (modifiedFiles.length === 0) return;

    let targets = [...modifiedFiles];
    if (includeTests) {
      const relatedTests = await gitUtils.findRelatedTests(root, modifiedFiles);
      targets = Array.from(new Set([...targets, ...relatedTests]));
    }

    // ディレクトリ階層を含めた全パスを導出（正規化済み）
    const allPaths = this.deriveAllPaths(targets);
    
    this.selection.clear();
    this.selection.addAll(allPaths);
    
    // 現在の選択状態を永続化（リポジトリに保存メソッドがあれば呼ぶ。現時点ではPreset以外はメモリ保持）
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
    
    this.selection.set(normPath, checked);

    const files = await repository.getFilesUnder(normPath);
    const allPaths = this.deriveAllPaths(files).map(p => normalizePath(p));
    
    const targetPaths = allPaths.filter(p => 
      p === normPath || p.startsWith(normPath + '/')
    );
    
    this.selection.setMany(targetPaths, checked);
  }
}
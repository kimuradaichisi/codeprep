import { Selection } from '../domain/Selection';
import { ISelectionRepository } from '../domain/ISelectionRepository';
import { IFileValidator } from '../domain/IFileValidator';
import { ISearchRepository } from '../domain/ISearchRepository';
import { GitWatcher } from '../infrastructure/GitWatcher';
import { PathService } from '../domain/PathService';
import { normalizePath } from '../../../utils/path';
import { IGitClient } from '../../git/domain/IGitClient';

export class SelectionUseCase {
  constructor(
    private selection: Selection,
    private repository: ISelectionRepository,
    private validator: IFileValidator,
    private gitWatcher?: GitWatcher
  ) { }

  public get currentSelection(): Selection { return this.selection; }

  public getPresetList(): string[] { return this.repository.getPresetList(); }

  public async savePreset(name: string): Promise<void> {
    await this.repository.savePaths(name, this.selection.getPaths());
    await this.repository.addToPresetList(name);
  }

  public async loadPreset(name: string): Promise<boolean> {
    const paths = await this.repository.loadPaths(name);
    if (!paths) return false;
    this.selection.clear();
    await this.addValidPaths(paths);
    return true;
  }

  public async selectByGrep(searchRepo: ISearchRepository, query: string): Promise<number> {
    const matchedFiles = await searchRepo.search(query);

    // 1. 物理的なリミット
    const MAX_LIMIT = 5000;
    const truncatedFiles = matchedFiles.slice(0, MAX_LIMIT);

    if (truncatedFiles.length === 0) return 0;

    // 2. 重い計算をマイクロタスクに逃がす
    return new Promise((resolve) => {
      setTimeout(() => {
        const allPaths = PathService.deriveAllPaths(truncatedFiles);
        this.selection.addAll(allPaths);

        // 🚨 vscode.window.showWarningMessage はUI層の責務なので、ここ（Application層）からは削除する
        resolve(truncatedFiles.length);
      }, 0);
    });
  }

  public async selectByExtension(wsRepo: { getAllFiles(): Promise<string[]> }, patterns: RegExp[]): Promise<number> {
    const allFiles = await wsRepo.getAllFiles();
    const matched = allFiles.filter(f => {
      const ext = (f.split('.').pop() || '').toLowerCase();
      return patterns.some(r => r.test(ext));
    });
    if (matched.length === 0) return 0;
    this.selection.clear();
    this.selection.addAll(PathService.deriveAllPaths(matched));
    return matched.length;
  }

  public async selectAll(wsRepo: { getAllFiles(): Promise<string[]> }): Promise<void> {
    const allFiles = await wsRepo.getAllFiles();
    this.selection.clear();
    this.selection.addAll(PathService.deriveAllPaths(allFiles));
  }

  public async invertSelection(wsRepo: { getAllFiles(): Promise<string[]> }): Promise<void> {
    const allFiles = await wsRepo.getAllFiles();
    this.selection.invert(PathService.deriveAllPaths(allFiles));
  }

  public async selectModifiedFiles(git: IGitClient, root: string, tests: boolean = false): Promise<void> {
    const modified = await this.getModifiedFilesInternal(git, root);
    if (modified.length === 0) return;

    let targets = [...modified];
    if (tests) {
      targets = await this.includeRelatedTests(git, root, targets);
    }
    this.selection.clear();
    this.selection.addAll(PathService.deriveAllPaths(targets));
  }

  private async getModifiedFilesInternal(git: IGitClient, root: string): Promise<string[]> {
    if (this.gitWatcher) {
      await this.gitWatcher.updateCache();
      return this.gitWatcher.getModifiedFiles();
    }
    const result = await git.getModifiedFiles(root);
    return result.isSuccess ? result.value : [];
  }

  private async includeRelatedTests(git: IGitClient, root: string, current: string[]): Promise<string[]> {
    const testResult = await git.findRelatedTests(root, current);
    return testResult.isSuccess ? Array.from(new Set([...current, ...testResult.value])) : current;
  }


  private async addValidPaths(paths: string[]): Promise<void> {
    const results = await Promise.all(paths.map(async p => ({
      path: p,
      isValid: (await this.validator.exists(p)) && !this.validator.isExcluded(p),
    })));
    results.filter(r => r.isValid).forEach(r => this.selection.set(r.path, true));
  }

  public async updateDirectorySelection(repo: any, relPath: string, checked: boolean): Promise<void> {
    const normPath = normalizePath(relPath);
    this.selection.set(normPath, checked);
    const files = await repo.getFilesUnder(normPath);
    const allPaths = PathService.deriveAllPaths(files).map(p => normalizePath(p));
    const targetPaths = allPaths.filter(p => p === normPath || p.startsWith(normPath + '/'));
    this.selection.setMany(targetPaths, checked);
  }
}



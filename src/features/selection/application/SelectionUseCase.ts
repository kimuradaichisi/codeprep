import { Selection } from '../domain/Selection';
import { ISelectionRepository } from '../domain/ISelectionRepository';
import { IFileValidator } from '../domain/IFileValidator';
import { ISearchRepository } from '../domain/ISearchRepository';
import { GitWatcher } from '../infrastructure/GitWatcher';
import * as path from 'path';
import { normalizePath } from '../../../utils/path';

export class SelectionUseCase {
  constructor(
    private selection: Selection,
    private repository: ISelectionRepository,
    private validator: IFileValidator,
    private gitWatcher?: GitWatcher
  ) {}

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
    if (matchedFiles.length === 0) return 0;

    const allPaths = this.deriveAllPaths(matchedFiles);
    this.selection.addAll(allPaths);
    return matchedFiles.length;
  }

  public async selectAll(wsRepo: { getAllFiles(): Promise<string[]> }): Promise<void> {
    const allFiles = await wsRepo.getAllFiles();
    this.selection.clear();
    this.selection.addAll(this.deriveAllPaths(allFiles));
  }

  public async invertSelection(wsRepo: { getAllFiles(): Promise<string[]> }): Promise<void> {
    const allFiles = await wsRepo.getAllFiles();
    this.selection.invert(this.deriveAllPaths(allFiles));
  }

  private deriveAllPaths(files: string[]): string[] {
    const result = new Set<string>();
    for (const file of files) {
      const normFile = normalizePath(file);
      if (!normFile || normFile === '.' || normFile === '/') continue;
      
      result.add(normFile);
      let parent = path.dirname(normFile);
      while (parent !== '.' && parent !== '/' && parent !== '') {
        if (result.has(parent)) break;
        result.add(parent);
        parent = path.dirname(parent);
      }
    }
    return Array.from(result);
  }

  public async selectModifiedFiles(git: any, root: string, tests: boolean = false): Promise<void> {
    let modified: string[] = [];
    if (this.gitWatcher) {
      await this.gitWatcher.updateCache();
      modified = this.gitWatcher.getModifiedFiles();
    } else {
      modified = await git.getModifiedFiles(root);
    }
    
    if (modified.length === 0) return;

    let targets = [...modified];
    if (tests && git.findRelatedTests) {
      const related = await git.findRelatedTests(root, modified);
      targets = Array.from(new Set([...targets, ...related]));
    }
    this.selection.clear();
    this.selection.addAll(this.deriveAllPaths(targets));
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
    const allPaths = this.deriveAllPaths(files).map(p => normalizePath(p));
    const targetPaths = allPaths.filter(p => p === normPath || p.startsWith(normPath + '/'));
    this.selection.setMany(targetPaths, checked);
  }
}
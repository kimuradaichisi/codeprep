import * as vscode from 'vscode';
import * as path from 'path';
import { Selection } from '../../selection/domain/Selection';
import { TokenUseCase } from '../../token/application/TokenUseCase';
import { FileTreeProvider } from '../FileTreeProvider';
import { GitWatcher } from '../../selection/infrastructure/GitWatcher';
import { IFileSystem } from '../../../shared/domain/IFileSystem';

export interface UIControllerDeps {
  selection: Selection;
  tokenUseCase: TokenUseCase;
  treeProvider: FileTreeProvider;
  fileSystem: IFileSystem;
  root: string | undefined;
  gitWatcher?: GitWatcher;
}

export class UIController {
  private debounceTimer: NodeJS.Timeout | undefined;
  private currentRequestSymbol: symbol | undefined;

  constructor(private readonly deps: UIControllerDeps) { }

  public async refresh(): Promise<void> {
    this.deps.gitWatcher?.updateCache();
    this.deps.treeProvider.refresh();
    const selectedPaths = this.deps.selection.getPaths();
    await vscode.commands.executeCommand('setContext', 'codeprep.selectionEmpty', selectedPaths.length === 0);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.startTokenUpdate(selectedPaths), 800);
  }

  private async startTokenUpdate(paths: string[]): Promise<void> {
    const requestSymbol = Symbol('TokenUpdate');
    this.currentRequestSymbol = requestSymbol;
    if (!this.deps.root || paths.length === 0) {
      this.deps.tokenUseCase.update([], 0);
      return;
    }
    this.deps.tokenUseCase.resetBatch();
    await this.processFilesInChunks(paths.slice(0, 10000), requestSymbol);
    this.finalizeBatchUpdate(requestSymbol);
  }

  private finalizeBatchUpdate(symbol: symbol) {
    if (symbol !== this.currentRequestSymbol) return;
    const limit = vscode.workspace.getConfiguration('codeprep').get('tokenLimit', 100000);
    this.deps.tokenUseCase.commitBatch(limit);
  }

  private async processFilesInChunks(paths: string[], requestSymbol: symbol) {
    for (let i = 0; i < paths.length; i += 20) {
      if (requestSymbol !== this.currentRequestSymbol) break;
      const chunk = paths.slice(i, i + 20);
      const results = await this.processChunk(chunk);
      results.forEach(r => this.deps.tokenUseCase.addFileToBatch(r.path, r.size));
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }


  private async processChunk(chunk: string[]) {
    const results = await Promise.all(chunk.map(async p => {
      const fullPath = path.join(this.deps.root!, p);
      const sizeResult = await this.deps.fileSystem.getFileSize(fullPath);
      return sizeResult.isSuccess ? { path: p, size: sizeResult.value } : null;
    }));

    return results.filter((f): f is { path: string, size: number } => f !== null);
  }

  public async updateButtonContexts(): Promise<void> {
    const config = vscode.workspace.getConfiguration('codeprep');
    const visibleButtons = config.get<string[]>('visibleButtons', []);
    const buttonMap = this.getButtonMap();
    for (const [cmd, ctx] of Object.entries(buttonMap)) {
      await vscode.commands.executeCommand('setContext', ctx, visibleButtons.includes(cmd));
    }
  }

  private getButtonMap(): Record<string, string> {
    return {
      'codeprep.refreshTree': 'codeprep.showRefreshTree',
      'codeprep.selectAll': 'codeprep.showSelectAll',
      'codeprep.clearAll': 'codeprep.showClearAll',
      'codeprep.generate': 'codeprep.showGenerate',
      'codeprep.generateStructure': 'codeprep.showGenerateStructure',
      'codeprep.selectGitDiff': 'codeprep.showSelectGitDiff',
      'codeprep.gitMenu': 'codeprep.showGitMenu',
      'codeprep.selectPrompt': 'codeprep.showSelectPrompt',
      'codeprep.savePreset': 'codeprep.showSavePreset',
      'codeprep.loadPreset': 'codeprep.showLoadPreset',
      'codeprep.invertSelection': 'codeprep.showInvertSelection'
    };
  }
}



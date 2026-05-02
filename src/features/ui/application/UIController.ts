import * as vscode from 'vscode';
import * as path from 'path';
import { Selection } from '../../selection/domain/Selection';
import { TokenUseCase } from '../../token/application/TokenUseCase';
import { FileTreeProvider } from '../FileTreeProvider';
import { GitWatcher } from '../../selection/infrastructure/GitWatcher';

export class UIController {
  private debounceTimer: NodeJS.Timeout | undefined;
  private currentRequestSymbol: symbol | undefined;

  constructor(
    private readonly selection: Selection,
    private readonly tokenUseCase: TokenUseCase,
    private readonly treeProvider: FileTreeProvider,
    private readonly root: string | undefined,
    private readonly gitWatcher?: GitWatcher
  ) {}

  /**
   * UIをリフレッシュする。
   * ツリーの見た目は即座に更新し、重い統計計算はデバウンスして非同期に実行する。
   */
  public async refresh(): Promise<void> {
    // 0. Git 状態をバックグラウンドで更新開始
    this.gitWatcher?.updateCache();

    // 1. ツリーとチェックボックスの見た目は即座に更新
    this.treeProvider.refresh();

    const selectedPaths = this.selection.getPaths();
    
    // 2. 空状態のコンテキスト更新も即座に行う
    await vscode.commands.executeCommand('setContext', 'codeprep.selectionEmpty', selectedPaths.length === 0);

    // 3. 重い統計計算をデバウンス
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.startTokenUpdate(selectedPaths);
    }, 300);
  }

  /**
   * トークン統計の更新を開始する。
   */
  private async startTokenUpdate(paths: string[]): Promise<void> {
    const requestSymbol = Symbol('TokenUpdate');
    this.currentRequestSymbol = requestSymbol;

    if (!this.root || paths.length === 0) {
      this.tokenUseCase.update([], 0);
      return;
    }

    const targets = paths.slice(0, 10000);
    const fileInfos = await this.processFilesInChunks(targets, requestSymbol);

    if (requestSymbol === this.currentRequestSymbol) {
      const config = vscode.workspace.getConfiguration('codeprep');
      this.tokenUseCase.update(fileInfos, config.get('tokenLimit', 100000));
    }
  }

  /**
   * 100ファイルごとにイベントループを解放しながらstatを取得する。
   */
  private async processFilesInChunks(paths: string[], requestSymbol: symbol) {
    const results: { path: string, size: number }[] = [];
    const CHUNK_SIZE = 100;

    for (let i = 0; i < paths.length; i += CHUNK_SIZE) {
      if (requestSymbol !== this.currentRequestSymbol) break;

      const chunk = paths.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Promise.all(chunk.map(async p => {
        try {
          const uri = vscode.Uri.file(path.join(this.root!, p));
          const stat = await vscode.workspace.fs.stat(uri);
          return (stat.type & vscode.FileType.Directory) ? null : { path: p, size: stat.size };
        } catch { return null; }
      }));

      results.push(...chunkResults.filter((f): f is { path: string, size: number } => f !== null));
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    return results;
  }

  public async updateButtonContexts(): Promise<void> {
    const config = vscode.workspace.getConfiguration('codeprep');
    const visibleButtons = config.get<string[]>('visibleButtons', []);
    const buttonMap: Record<string, string> = {
      'codeprep.refreshTree': 'codeprep.showRefreshTree',
      'codeprep.selectAll': 'codeprep.showSelectAll',
      'codeprep.clearAll': 'codeprep.showClearAll',
      'codeprep.generate': 'codeprep.showGenerate',
      'codeprep.selectGitDiff': 'codeprep.showSelectGitDiff',
      'codeprep.gitMenu': 'codeprep.showGitMenu',
      'codeprep.selectPrompt': 'codeprep.showSelectPrompt',
      'codeprep.savePreset': 'codeprep.showSavePreset',
      'codeprep.loadPreset': 'codeprep.showLoadPreset',
      'codeprep.invertSelection': 'codeprep.showInvertSelection'
    };

    for (const [cmd, ctx] of Object.entries(buttonMap)) {
      await vscode.commands.executeCommand('setContext', ctx, visibleButtons.includes(cmd));
    }
  }
}
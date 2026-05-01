import * as vscode from 'vscode';
import * as path from 'path';
import { Selection } from '../../selection/domain/Selection';
import { TokenUseCase } from '../../token/application/TokenUseCase';
import { FileTreeProvider } from '../FileTreeProvider';

export class UIController {
  constructor(
    private readonly selection: Selection,
    private readonly tokenUseCase: TokenUseCase,
    private readonly treeProvider: FileTreeProvider,
    private readonly root: string | undefined
  ) {}

  /**
   * 選択状態、トークン数、ツリー表示を同期します
   */
  public async refresh(): Promise<void> {
    const selectedPaths = this.selection.getPaths();
    await vscode.commands.executeCommand('setContext', 'codeprep.selectionEmpty', selectedPaths.length === 0);

    if (selectedPaths.length > 10000 || !this.root) {
      this.tokenUseCase.update([], 0);
      this.treeProvider.refresh();
      return;
    }

    const fileInfos = await Promise.all(selectedPaths.map(async p => {
      try {
        const uri = vscode.Uri.file(path.join(this.root!, p));
        const stat = await vscode.workspace.fs.stat(uri);
        return stat.type === vscode.FileType.Directory ? null : { path: p, size: stat.size };
      } catch { return null; }
    }));

    const files = fileInfos.filter((f): f is { path: string, size: number } => f !== null);
    const config = vscode.workspace.getConfiguration('codeprep');
    this.tokenUseCase.update(files, config.get('tokenLimit', 100000));
    this.treeProvider.refresh();
  }

  /**
   * 設定に基づいてボタンの表示/非表示を切り替えます
   */
  public async updateButtonContexts(): Promise<void> {
    const config = vscode.workspace.getConfiguration('codeprep');
    const visibleButtons = config.get<string[]>('visibleButtons', []);
    const buttonMap: Record<string, string> = {
      'codeprep.refreshTree': 'codeprep.showRefreshTree',
      'codeprep.selectAll': 'codeprep.showSelectAll',
      'codeprep.clearAll': 'codeprep.showClearAll',
      'codeprep.generate': 'codeprep.showGenerate',
      'codeprep.selectGitDiff': 'codeprep.showSelectGitDiff',
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
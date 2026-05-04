import * as vscode from 'vscode';
import { IGitClient } from '../../git/domain/IGitClient';

/**
 * Git の変更状態を監視し、キャッシュを保持するインフラストラクチャ・サービス。
 */
export class GitWatcher implements vscode.Disposable {
  private modifiedFiles: Set<string> = new Set();
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly root: string,
    private readonly gitClient: IGitClient
  ) {
    this.startWatching();
    this.updateCache();
  }

  private debounceTimer: NodeJS.Timeout | undefined;

  private startWatching(): void {
    if (!this.root) return;
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this.root, '**/*')
    );
    const triggerUpdate = () => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.updateCache(), 1000);
    };
    this.disposables.push(
      watcher.onDidChange(triggerUpdate),
      watcher.onDidCreate(triggerUpdate),
      watcher.onDidDelete(triggerUpdate),
      watcher
    );
  }


  /**
   * 非同期で Git 状態を更新し、キャッシュを最新にする
   */
  public async updateCache(): Promise<void> {
    if (!this.root) return;
    const result = await this.gitClient.getModifiedFiles(this.root);
    if (result.isSuccess) {
      this.modifiedFiles = new Set(result.value);
    }
  }

  /**
   * 指定されたパスが変更されているか（Git status に存在するか）を返す
   */
  public isModified(relPath: string): boolean {
    return this.modifiedFiles.has(relPath);
  }

  /**
   * キャッシュされている変更ファイル一覧を取得する
   */
  public getModifiedFiles(): string[] {
    return Array.from(this.modifiedFiles);
  }

  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }
}


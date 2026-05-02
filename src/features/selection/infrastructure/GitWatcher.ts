import * as vscode from 'vscode';
import { GitUtils } from '../../../utils/git';

/**
 * Git の変更状態を監視し、キャッシュを保持するインフラストラクチャ・サービス。
 */
export class GitWatcher implements vscode.Disposable {
  private modifiedFiles: Set<string> = new Set();
  private disposables: vscode.Disposable[] = [];

  constructor(private readonly root: string) {
    this.startWatching();
    this.updateCache();
  }

  private startWatching(): void {
    if (!this.root) return;
    
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this.root, '**/*')
    );
    
    this.disposables.push(
      watcher.onDidChange(() => this.updateCache()),
      watcher.onDidCreate(() => this.updateCache()),
      watcher.onDidDelete(() => this.updateCache()),
      watcher
    );
  }

  /**
   * 非同期で Git 状態を更新し、キャッシュを最新にする
   */
  public async updateCache(): Promise<void> {
    if (!this.root) return;
    const files = await GitUtils.getModifiedFiles(this.root);
    this.modifiedFiles = new Set(files);
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

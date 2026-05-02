import * as vscode from 'vscode';
import { ISearchRepository } from '../domain/ISearchRepository';
import { getRelativePath } from '../../../utils/path';

/**
 * VSCode 内蔵コマンド用の型定義
 */
interface TextSearchMatch {
  uri: vscode.Uri;
}

interface TextSearchOptions {
  includes?: string[];
  excludes?: string[];
  useIgnoreFiles?: boolean;
  followSymlinks?: boolean;
}

export class VSCodeSearchRepository implements ISearchRepository {
  constructor(private workspaceRoot: string) {}

  /**
   * VSCode 内蔵の ripgrep エンジンを使用して高速検索を行う。
   */
  public async search(query: string): Promise<string[]> {
    const results = new Set<string>();
    const options = this.createSearchOptions();

    await vscode.commands.executeCommand(
      'vscode.executeTextSearch',
      { pattern: query, isCaseSensitive: false },
      options,
      {
        report: (result: TextSearchMatch) => {
          results.add(getRelativePath(this.workspaceRoot, result.uri.fsPath));
        }
      }
    );

    return Array.from(results);
  }

  private createSearchOptions(): TextSearchOptions {
    const config = vscode.workspace.getConfiguration('codeprep');
    return {
      includes: ['**/*'],
      excludes: config.get<string[]>('exclude', []),
      useIgnoreFiles: true,
      followSymlinks: false
    };
  }
}

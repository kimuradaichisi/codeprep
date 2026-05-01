import * as vscode from 'vscode';
import { ISearchRepository } from '../domain/ISearchRepository';
import { getRelativePath } from '../../../utils/path';

export class VSCodeSearchRepository implements ISearchRepository {
  constructor(private workspaceRoot: string) {}

  /**
   * 安定版APIを使用して高速検索を行う。
   * findFilesで対象を絞り込み、並列で内容をチェックする。
   */
  public async search(query: string): Promise<string[]> {
    const exclude = this.getExcludePattern();
    const uris = await vscode.workspace.findFiles('**/*', exclude);
    
    const results: string[] = [];
    const CHUNK_SIZE = 50; // 同時オープンファイル数を制限してクラッシュを防止

    for (let i = 0; i < uris.length; i += CHUNK_SIZE) {
      const chunk = uris.slice(i, i + CHUNK_SIZE);
      const matches = await Promise.all(chunk.map(uri => this.checkFileContains(uri, query)));
      
      matches.forEach(match => {
        if (match) results.push(getRelativePath(this.workspaceRoot, match));
      });
    }

    return results;
  }

  /**
   * ファイルが指定した文字列を含んでいるかチェックする
   */
  private async checkFileContains(uri: vscode.Uri, query: string): Promise<string | null> {
    try {
      const contentRaw = await vscode.workspace.fs.readFile(uri);
      const content = Buffer.from(contentRaw).toString('utf8');
      
      // 大文字小文字を区別せずに検索
      if (content.toLocaleLowerCase().includes(query.toLocaleLowerCase())) {
        return uri.fsPath;
      }
    } catch {
      return null; // 読み取り不可のファイルはスキップ
    }
    return null;
  }

  private getExcludePattern(): string {
    const config = vscode.workspace.getConfiguration('codeprep');
    const excludes = config.get<string[]>('exclude', []);
    return excludes.length > 0 ? `{${excludes.join(',')}}` : '';
  }
}
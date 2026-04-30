import * as vscode from 'vscode';
import { getRelativePath } from '../../../utils/path';

/**
 * VSCode ワークスペースのファイル検索を担当するクラス
 */
export class VSCodeWorkspaceRepository {
  constructor(private workspaceRoot: string) {}

  public async getAllFiles(): Promise<string[]> {
    const config = vscode.workspace.getConfiguration('codeprep');
    const excludes = config.get<string[]>('exclude', []);
    const excludePattern = `{${excludes.join(',')}}`;
    
    const files = await vscode.workspace.findFiles('**/*', excludePattern);
    return files.map((f) => getRelativePath(this.workspaceRoot, f.fsPath));
  }
}

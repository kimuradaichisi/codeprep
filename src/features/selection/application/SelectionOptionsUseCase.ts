/*
 * Copyright 2026 CodePrep Contributors
 */
import * as vscode from 'vscode';
import { t } from '../../../utils/i18n';

export interface GenerationOptionItem extends vscode.QuickPickItem {
  id: string;
}

export class SelectionOptionsUseCase {
  public async configureOptions(): Promise<void> {
    const config = vscode.workspace.getConfiguration('codeprep');
    const opts = this.getOptionItems(config);

    const selected = await vscode.window.showQuickPick(opts, {
      canPickMany: true,
      placeHolder: 'オプション切替'
    });

    // undefined（キャンセル）でなければ実行
    if (selected !== undefined) {
      await this.applyChanges(opts, selected);
    }
  }

  private getOptionItems(config: vscode.WorkspaceConfiguration): GenerationOptionItem[] {
    return [
      { id: 'skeletonMode', label: '$(symbol-structure) Skeleton Mode', picked: !!config.get<boolean>('skeletonMode') },
      { id: 'includeDependencies', label: '$(references) Include Dependencies', picked: !!config.get<boolean>('includeDependencies') },
      { id: 'includeErrors', label: '$(error) Include Errors', picked: !!config.get<boolean>('includeErrors') },
      { id: 'incrementalMode', label: '$(history) Incremental Mode', picked: !!config.get<boolean>('incrementalMode') }
    ];
  }

  private async applyChanges(all: GenerationOptionItem[], selected: GenerationOptionItem[]): Promise<void> {
    const selectedIds = new Set(selected.map(s => s.id));

    // セクション指定（'codeprep'）で取得する
    const config = vscode.workspace.getConfiguration('codeprep');

    for (const o of all) {
      const isPicked = selectedIds.has(o.id);
      // ✅ 修正ポイント: 
      // 1. スコープ済みconfigを使っているので、o.id (skeletonMode 等) をそのまま使う
      // 2. ターゲットを undefined にすることで、VS Code が最適な場所（Workspace > Global）へ書き込む
      await config.update(o.id, isPicked, undefined);
    }

    vscode.window.showInformationMessage(t('optionsUpdated'));
  }
}
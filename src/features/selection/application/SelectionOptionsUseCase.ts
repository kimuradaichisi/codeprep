/*
 * Copyright 2026 CodePrep Contributors
 */
import * as vscode from 'vscode';

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

    if (selected) {
      await this.applyChanges(config, opts, selected);
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

  private async applyChanges(config: vscode.WorkspaceConfiguration, all: GenerationOptionItem[], selected: GenerationOptionItem[]): Promise<void> {
    const selectedIds = selected.map(s => s.id);
    for (const o of all) {
      await config.update(o.id, selectedIds.includes(o.id), vscode.ConfigurationTarget.Global);
}
    vscode.window.showInformationMessage('CodePrep: Options updated.');
  }
}
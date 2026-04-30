import * as vscode from 'vscode';
import { ISelectionRepository } from '../domain/ISelectionRepository';

/**
 * VSCode の workspaceState を使用したリポジトリ実装
 */
export class VSCodeSelectionRepository implements ISelectionRepository {
  private readonly PRESET_KEY_PREFIX = 'codeprep.preset.';
  private readonly PRESET_LIST_KEY = 'codeprep.presets';

  constructor(private workspaceState: vscode.Memento) {}

  public async savePaths(name: string, paths: string[]): Promise<void> {
    await this.workspaceState.update(this.PRESET_KEY_PREFIX + name, paths);
  }

  public async loadPaths(name: string): Promise<string[] | undefined> {
    return this.workspaceState.get<string[]>(this.PRESET_KEY_PREFIX + name);
  }

  public getPresetList(): string[] {
    return this.workspaceState.get<string[]>(this.PRESET_LIST_KEY, []);
  }

  public async addToPresetList(name: string): Promise<void> {
    const presets = this.getPresetList();
    if (!presets.includes(name)) {
      presets.push(name);
      await this.workspaceState.update(this.PRESET_LIST_KEY, presets);
    }
  }
}

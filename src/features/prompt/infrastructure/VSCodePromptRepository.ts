import * as vscode from 'vscode';
import { IPromptRepository } from '../domain/IPromptRepository';
import { PromptCollection } from '../domain/PromptCollection';

/**
 * VSCode の設定(Configuration)を使用してプロンプトを保存・取得するリポジトリ
 */
export class VSCodePromptRepository implements IPromptRepository {
  private static readonly CONFIG_SECTION = 'codeprep';
  private static readonly CONFIG_KEY = 'customPrompts';
  private static readonly ALWAYS_PATCH_KEY = 'alwaysAddPatchInstructions';

  public async loadAll(): Promise<PromptCollection> {
    const config = vscode.workspace.getConfiguration(VSCodePromptRepository.CONFIG_SECTION);
    const record = config.get<Record<string, string>>(VSCodePromptRepository.CONFIG_KEY, {});
    return PromptCollection.fromRecord(record);
  }

  public async saveAll(collection: PromptCollection): Promise<void> {
    const config = vscode.workspace.getConfiguration(VSCodePromptRepository.CONFIG_SECTION);
    await config.update(
      VSCodePromptRepository.CONFIG_KEY, 
      collection.toRecord(), 
      vscode.ConfigurationTarget.Global
    );
  }

  public getPatchInjectionPrompt(): string {
    return vscode.l10n.t('prompt.patchInjection');
  }

  public async shouldAlwaysAddPatchInstructions(): Promise<boolean> {
    const config = vscode.workspace.getConfiguration(VSCodePromptRepository.CONFIG_SECTION);
    return config.get<boolean>(VSCodePromptRepository.ALWAYS_PATCH_KEY, true);
  }
}

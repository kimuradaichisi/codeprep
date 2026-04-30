import * as vscode from 'vscode';

/**
 * ユーザーが定義したカスタムプロンプトを管理し、選択UIを提供するサービス。
 */
export class PromptService {
    private static readonly CONFIG_SECTION = 'codeprep';
    private static readonly CONFIG_KEY = 'customPrompts';

    private selectedPrompt: string | undefined;

    /**
     * 設定からプロンプトのリストを取得し、ユーザーに選択させます。
     * @returns 選択されたプロンプトの内容。キャンセルされた場合は undefined。
     */
    public async selectPrompt(): Promise<string | undefined> {
        const config = vscode.workspace.getConfiguration(PromptService.CONFIG_SECTION);
        const prompts = config.get<Record<string, string>>(PromptService.CONFIG_KEY, {});

        const items: vscode.QuickPickItem[] = Object.entries(prompts).map(([label, description]) => ({
            label,
            detail: description
        }));

        if (items.length === 0) {
            vscode.window.showInformationMessage('No custom prompts defined in settings (codeprep.customPrompts).');
            return undefined;
        }

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a custom prompt to prepend to the output'
        });

        if (selected) {
            this.selectedPrompt = selected.detail;
            return this.selectedPrompt;
        }

        return undefined;
    }

    /**
     * 現在選択されているプロンプトを取得します。
     */
    public getSelectedPrompt(): string | undefined {
        return this.selectedPrompt;
    }

    /**
     * 選択状態をクリアします。
     */
    public clearSelection(): void {
        this.selectedPrompt = undefined;
    }

    /**
     * 現在設定されているすべてのプリセットを取得します。
     */
    public getAllPresets(): Record<string, string> {
        const config = vscode.workspace.getConfiguration(PromptService.CONFIG_SECTION);
        return config.get<Record<string, string>>(PromptService.CONFIG_KEY, {});
    }

    /**
     * 外部から提供されたプリセットを既存の設定にマージして保存します。
     */
    public async importPresets(newPresets: Record<string, string>): Promise<void> {
        const config = vscode.workspace.getConfiguration(PromptService.CONFIG_SECTION);
        const currentPresets = config.get<Record<string, string>>(PromptService.CONFIG_KEY, {});
        
        // マージ処理 (重複時は新規で上書き)
        const mergedPresets = { ...currentPresets, ...newPresets };
        
        await config.update(PromptService.CONFIG_KEY, mergedPresets, vscode.ConfigurationTarget.Global);
    }
}

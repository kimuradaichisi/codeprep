import * as vscode from 'vscode';
import * as path from 'path';
import { NativeEngine } from '../engines/NativeEngine';
import { CodePrepCLIEngine } from '../engines/CodePrepCLIEngine';
import { PromptService } from './PromptService';
import { TokenService } from './TokenService';
import { PreviewProvider } from '../providers/PreviewProvider';

/**
 * 生成処理の実行を制御するサービス。
 * エンジンの切り替えロジックを保持。
 */
export class CommandService {
    constructor(
        private promptService: PromptService,
        private nativeEngine: NativeEngine,
        private tokenService: TokenService,
        private previewProvider: PreviewProvider
    ) {}

    /**
     * 現在の設定に基づき、適切なエンジンを使用してパック処理を実行します。
     */
    public async execute(workspaceRoot: string, selectedPaths: string[]): Promise<void> {
        console.log(`CodePrep: [DEBUG] CommandService.execute started. Root: ${workspaceRoot}, Files: ${selectedPaths.length}`);
        if (selectedPaths.length === 0) {
            console.warn('CodePrep: [DEBUG] No files selected.');
            vscode.window.showWarningMessage('CodePrep: No files selected.');
            return;
        }
        const config = vscode.workspace.getConfiguration('codeprep');
        const useNative = config.get<boolean>('useNativeEngine', true);

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "CodePrep: Generating pack...",
                cancellable: false
            }, async () => {
                if (useNative) {
                    console.log('CodePrep: Using Native Engine');
                    const files = await this.readFiles(workspaceRoot, selectedPaths);
                    console.log(`CodePrep: Read ${files.length} files successfully.`);
                    const prompt = this.promptService.getSelectedPrompt();
                    const output = await this.nativeEngine.generate(files, prompt);
                    
                    const enablePreview = config.get<boolean>('enablePreview', false);
                    const outputFilePath = config.get<string>('outputFilePath', 'codeprep-output.txt');

                    if (enablePreview) {
                        const previewUri = vscode.Uri.parse(`${PreviewProvider.scheme}:preview.md`);
                        this.previewProvider.update(previewUri, output);
                        await vscode.window.showTextDocument(previewUri, { preview: true });
                        vscode.window.showInformationMessage('CodePrep: Preview generated.');
                    } else {
                        // プレビューが無効な場合は従来通りファイル保存とクリップボードコピーを実行
                        try {
                            const fullOutputPath = path.isAbsolute(outputFilePath) 
                                ? vscode.Uri.file(outputFilePath) 
                                : vscode.Uri.file(path.join(workspaceRoot, outputFilePath));
                            await vscode.workspace.fs.writeFile(fullOutputPath, Buffer.from(output, 'utf8'));
                        } catch (e: any) {
                            vscode.window.showWarningMessage(`Could not write to file: ${e.message}`);
                        }

                        await vscode.env.clipboard.writeText(output);
                        const estimatedTokens = Math.ceil(output.length / 4);
                        vscode.window.showInformationMessage(`CodePrep (Native): Pack completed! (~${estimatedTokens} tokens). Saved to: ${outputFilePath} and copied to clipboard.`);
                    }
                } else {
                    const cliEngine = new CodePrepCLIEngine();
                    const result = await cliEngine.generate([]);
                    vscode.window.showInformationMessage(`CodePrep (CLI): ${result}`);
                }
            });
        } catch (error: any) {
            vscode.window.showErrorMessage(`CodePrep Error: ${error.message}`);
        }
    }

    private async readFiles(workspaceRoot: string, paths: string[]): Promise<{ path: string; content: string }[]> {
        const results: { path: string; content: string }[] = [];
        for (const relPath of paths) {
            try {
                const fullPath = vscode.Uri.file(path.join(workspaceRoot, relPath));
                const content = await vscode.workspace.fs.readFile(fullPath);
                results.push({
                    path: relPath,
                    content: Buffer.from(content).toString('utf8')
                });
            } catch {
                // ファイル読み取りエラーはスキップ
            }
        }
        return results;
    }
}

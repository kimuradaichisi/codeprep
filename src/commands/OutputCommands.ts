import * as vscode from 'vscode';
import * as path from 'path';
import { SelectionUseCase } from '../features/selection/application/SelectionUseCase';
import { OutputEngine } from '../features/engine/domain/OutputEngine';
import { PromptUseCase } from '../features/prompt/application/PromptUseCase';

export class OutputCommands {
  constructor(
    private selectionUseCase: SelectionUseCase,
    private promptUseCase: PromptUseCase,
    private engine: OutputEngine,
    private root: string | undefined
  ) {}

  async generate() {
    const paths = this.selectionUseCase.currentSelection.getPaths();
    if (paths.length === 0) return;

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "CodePrep: Packing files...",
      cancellable: false
    }, async () => {
      const filesWithContent = await Promise.all(paths.map(async p => {
        try {
          const uri = vscode.Uri.file(path.join(this.root || '', p));
          const stat = await vscode.workspace.fs.stat(uri);
          
          if ((stat.type & vscode.FileType.Directory) === vscode.FileType.Directory) {
            return null;
          }

          const contentRaw = await vscode.workspace.fs.readFile(uri);
          
          // 【修正箇所】 .toString() ではなく Buffer.from を使う
          // または new TextDecoder().decode(contentRaw)
          const content = Buffer.from(contentRaw).toString('utf8');
          
          return { path: p, content };
        } catch {          
          return null;
        }
      }));

      const files = filesWithContent.filter((f): f is { path: string, content: string } => f !== null);
      
      if (files.length === 0) {
        // 元のコードにあった警告メッセージを復元
        vscode.window.showWarningMessage('No files selected to generate content.');
        return;
      }

      const config = vscode.workspace.getConfiguration('codeprep');
      const options = {
        format: config.get('outputFormat', 'markdown') as any,
        outputMode: config.get('outputMode', 'everything') as any,
        includeMetadata: config.get('includeMetadata', true),
        removeComments: config.get('removeComments', false),
        includeEmptyLines: config.get('includeEmptyLines', true)
      };

      // プロンプト取得のロジックを元に戻す (undefined を許容)
      const promptName = this.promptUseCase.getSelectedPrompt();
      const promptContent = promptName ? await this.promptUseCase.getPromptContent(promptName) : undefined;
      
      const result = this.engine.generate(files, options, promptContent);
      
      await vscode.env.clipboard.writeText(result.content);
      // 元の完了メッセージを復元
      vscode.window.showInformationMessage('CodePrep: Pack completed and copied to clipboard.');

      // (オプション) リファクタで追加したエディタ表示機能を残す場合はここに記述
      const doc = await vscode.workspace.openTextDocument({
        content: result.content,
        language: options.format === 'markdown' ? 'markdown' : 'text'
      });
      await vscode.window.showTextDocument(doc, { preview: false });
    });
  }
}
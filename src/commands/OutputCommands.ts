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
      title: "CodePrep: Generating content...",
    }, async () => this.runGeneration(paths));
  }

  private async runGeneration(paths: string[]) {
    const files = await this.readFiles(paths);
    if (files.length === 0) return vscode.window.showWarningMessage('No files selected.');

    const options = this.getOptions();
    const prompt = await this.getPrompt();
    const result = this.engine.generate(files, options, prompt);

    await vscode.env.clipboard.writeText(result.content);
    await this.handleOutput(result.content, options.format);
  }

  private async readFiles(paths: string[]) {
    const results = await Promise.all(paths.map(async p => {
      try {
        const uri = vscode.Uri.file(path.join(this.root || '', p));
        const stat = await vscode.workspace.fs.stat(uri);
        if (stat.type & vscode.FileType.Directory) return null;
        const raw = await vscode.workspace.fs.readFile(uri);
        return { path: p, content: Buffer.from(raw).toString('utf8') };
      } catch { return null; }
    }));
    return results.filter((f): f is { path: string, content: string } => f !== null);
  }

  private getOptions() {
    const config = vscode.workspace.getConfiguration('codeprep');
    return {
      format: config.get('outputFormat', 'markdown') as any,
      outputMode: config.get('outputMode', 'everything') as any,
      includeMetadata: config.get('includeMetadata', true),
      removeComments: config.get('removeComments', false),
      includeEmptyLines: config.get('includeEmptyLines', true)
    };
  }

  private async getPrompt() {
    const name = this.promptUseCase.getSelectedPrompt();
    return name ? await this.promptUseCase.getPromptContent(name) : undefined;
  }

  private async handleOutput(content: string, format: string) {
    const config = vscode.workspace.getConfiguration('codeprep');
    vscode.window.showInformationMessage('CodePrep: Copied to clipboard.');

    if (config.get('openAfterGenerate', true)) {
      const lang = format === 'json' ? 'json' : (format === 'xml' ? 'xml' : 'markdown');
      const doc = await vscode.workspace.openTextDocument({ content, language: lang });
      // 修正: vscode.ViewColumn.One を使用
      await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.One });
    }
  }
}
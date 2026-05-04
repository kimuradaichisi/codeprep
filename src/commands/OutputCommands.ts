import * as vscode from 'vscode';
import * as path from 'path';
import { SelectionUseCase } from '../features/selection/application/SelectionUseCase';
import { OutputEngine } from '../features/engine/domain/OutputEngine';
import { PromptUseCase } from '../features/prompt/application/PromptUseCase';
import { IFileSystem } from '../shared/domain/IFileSystem';

export interface OutputCommandsDeps {
  selectionUseCase: SelectionUseCase;
  promptUseCase: PromptUseCase;
  engine: OutputEngine;
  fileSystem: IFileSystem;
  root: string | undefined;
}

export class OutputCommands {
  constructor(private readonly deps: OutputCommandsDeps) {}

  async generate() {
    const paths = this.deps.selectionUseCase.currentSelection.getPaths();
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
    const prompt = await this.getPrompt(paths);
    const result = this.deps.engine.generate(files, options, prompt);
    await vscode.env.clipboard.writeText(result.content);
    await this.handleOutput(result.content, options.format);
  }

  private async readFiles(paths: string[]) {
    const results = await Promise.all(paths.map(async p => {
      const fullPath = path.join(this.deps.root || '', p);
      const contentResult = await this.deps.fileSystem.readFile(fullPath);
      return contentResult.isSuccess ? { path: p, content: contentResult.value } : null;
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
      includeEmptyLines: config.get('includeEmptyLines', true),
      maxFileSizeKB: config.get('maxFileSizeKB', 500)
    };
  }

  private async getPrompt(paths: string[]) {
    const name = this.deps.promptUseCase.getSelectedPrompt();
    if (!name) return undefined;
    return await this.deps.promptUseCase.getPromptContent(name, {
      language: vscode.env.language,
      files: paths
    });
  }

  private async handleOutput(content: string, format: string) {
    const config = vscode.workspace.getConfiguration('codeprep');
    vscode.window.showInformationMessage('CodePrep: Copied to clipboard.');
    if (!config.get('openAfterGenerate', true)) return;
    await this.openInEditor(content, format);
  }

  private async openInEditor(content: string, format: string) {
    const info = this.getFormatInfo(format);
    const uri = vscode.Uri.parse(`untitled:CodePrep Output${info.ext}`);
    try {
      const doc = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.One });
      await editor.edit(eb => {
        eb.replace(new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length)), content);
      });
      await vscode.languages.setTextDocumentLanguage(doc, info.lang);
    } catch {
      const doc = await vscode.workspace.openTextDocument({ content, language: info.lang });
      await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.One });
    }
  }

  private getFormatInfo(format: string) {
    if (format === 'json') return { ext: '.json', lang: 'json' };
    if (format === 'xml') return { ext: '.xml', lang: 'xml' };
    return { ext: '.md', lang: 'markdown' };
  }
}

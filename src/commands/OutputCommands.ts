/*
 * Copyright 2026 CodePrep Contributors
 */
import * as vscode from 'vscode';
import { t } from '../utils/i18n';
import * as path from 'path';
import { SelectionUseCase } from '../features/selection/application/SelectionUseCase';
import { OutputEngine } from '../features/engine/domain/OutputEngine';
import { PromptUseCase } from '../features/prompt/application/PromptUseCase';
import { IFileSystem } from '../shared/domain/IFileSystem';
import { DependencyScanner } from '../features/engine/application/DependencyScanner';
import { DiagnosticService } from '../features/engine/infrastructure/DiagnosticService';
import { countValidFiles } from '../features/selection/application/util/countValidFiles';
import { OutputOptions } from '../features/engine/domain/OutputOptions';

export interface OutputCommandsDeps {
  selectionUseCase: SelectionUseCase; promptUseCase: PromptUseCase;
  engine: OutputEngine; fileSystem: IFileSystem; root: string | undefined;
}
interface FileContent { path: string; content: string; skeleton?: boolean; }

export class OutputCommands {
  private static lastState: Map<string, string> = new Map();
  private static lastOutputDoc: vscode.TextDocument | undefined; // テスト再利用用
  private readonly scanner = new DependencyScanner();
  private readonly diag = new DiagnosticService();

  constructor(private readonly deps: OutputCommandsDeps) { }

  async generate(): Promise<void> {
    const paths = this.deps.selectionUseCase.currentSelection.getPaths();
    if (paths.length === 0) return;

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification, title: t('progress.generating'),
    }, () => this.runGeneration(paths));
  }

  async generateStructure(): Promise<void> {
    const paths = this.deps.selectionUseCase.currentSelection.getPaths();
    if (paths.length === 0) return;

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification, title: t('progress.generatingStructure')
    }, async () => {
      // For structure-only output we don't need file contents; provide empty content placeholders
      const files = paths.map(p => ({ path: p, content: '' }));
      const prompt = await this.getPrompt(paths);
      const opts = this.getOptions();
      opts.outputMode = 'structureOnly';

      const result = this.deps.engine.generate(files as any, opts, prompt);
      await this.finalize(result.content, files, opts.format);
    });
  }

  private async runGeneration(paths: string[]): Promise<void> {
    const opts = this.getOptions();
    const files = await this.processFiles(paths, opts);
    if (files.length === 0) return;

    const prompt = await this.getPrompt(paths);
    const result = this.deps.engine.generate(files, opts, prompt);
    const content = opts.includeErrors
      ? this.diag.formatErrors(paths) + result.content
      : result.content;

    await this.finalize(content, files, opts.format);
  }

  private async processFiles(paths: string[], opts: OutputOptions): Promise<FileContent[]> {
    const files = await this.readFiles(paths);
    if (opts.includeDependencies) {
      for (const f of [...files]) {
        const deps = await this.scanner.findDependencies(f.path, f.content, this.deps.root || '');
        const newFiles = await this.readFiles(deps.filter(d => !files.some(ex => ex.path === d)));
        files.push(...newFiles.map(nf => ({ ...nf, skeleton: true })));
      }
    }
    return opts.incrementalMode ? files.filter(f => OutputCommands.lastState.get(f.path) !== f.content) : files;
  }

  private async readFiles(paths: string[]): Promise<FileContent[]> {
    const limit = vscode.workspace.getConfiguration('codeprep').get<number>('maxFileSizeKB', 500);
    const res = await Promise.all(paths.map(async p => {
      const full = path.join(this.deps.root || '', p);
      const size = await this.deps.fileSystem.getFileSize(full);
      if (size.isSuccess && size.value > limit * 1024) return { path: p, content: `[File omitted: >${limit}KB]` };
      const content = await this.deps.fileSystem.readFile(full);
      return content.isSuccess ? { path: p, content: content.value } : null;
    }));
    return res.filter((f): f is FileContent => f !== null);
  }

  private getOptions(): OutputOptions {
    const c = vscode.workspace.getConfiguration('codeprep');
    return {
      format: c.get<string>('outputFormat', 'markdown') as any,
      includeMetadata: c.get<boolean>('includeMetadata', true),
      removeComments: c.get<boolean>('removeComments', false),
      includeEmptyLines: c.get<boolean>('includeEmptyLines', true),
      outputMode: c.get<'everything' | 'structureOnly'>('outputMode', 'everything'),
      maxFileSizeKB: c.get<number>('maxFileSizeKB', 500),
      skeletonMode: c.get<boolean>('skeletonMode', false),
      includeDependencies: c.get<boolean>('includeDependencies', false),
      includeErrors: c.get<boolean>('includeErrors', false),
      incrementalMode: c.get<boolean>('incrementalMode', false)
    };
  }

  private async getPrompt(paths: string[]) {
    const name = this.deps.promptUseCase.getSelectedPrompt();
    return name ? this.deps.promptUseCase.getPromptContent(name, { language: vscode.env.language, files: paths }) : undefined;
  }

  private async finalize(content: string, files: FileContent[], format: string): Promise<void> {
    await vscode.env.clipboard.writeText(content);
    files.forEach(f => OutputCommands.lastState.set(f.path, f.content));
    // show processed-file count based on actual file contents
    const count = countValidFiles(files as any);
    vscode.window.showInformationMessage(`${count} files copied`);

    if (!vscode.workspace.getConfiguration('codeprep').get('openAfterGenerate', true)) {
      return;
    }

    const lang = format === 'json' ? 'json' : (format === 'xml' ? 'xml' : 'markdown');

    // 既存のタブを探す
    const existingDoc = OutputCommands.lastOutputDoc;
    const editors = vscode.window.visibleTextEditors || []; // null/undefined ガード
    const existingEditor = existingDoc
      ? editors.find(e => e.document === existingDoc)
      : undefined;

    if (existingEditor && existingDoc && !existingDoc.isClosed) {
      // 既存タブの内容を更新
      await existingEditor.edit(editBuilder => {
        const lastLine = existingDoc.lineCount - 1;
        const lastChar = existingDoc.lineAt(lastLine).text.length;
        const fullRange = new vscode.Range(
          new vscode.Position(0, 0),
          new vscode.Position(lastLine, lastChar)
        );
        editBuilder.replace(fullRange, content);
      });
    } else {
      // 新規作成
      const doc = await vscode.workspace.openTextDocument({ content, language: lang });
      OutputCommands.lastOutputDoc = doc;
      await vscode.window.showTextDocument(doc, { preview: false });
    }
  }
}
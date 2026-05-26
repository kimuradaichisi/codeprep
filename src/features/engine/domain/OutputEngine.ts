/*
 * Copyright 2026 CodePrep Contributors
 */
import { OutputOptions } from './OutputOptions';
import { OutputResult } from './OutputResult';
import { IFormatter } from './formatters/IFormatter';
import { MarkdownFormatter } from './formatters/MarkdownFormatter';
import { XmlFormatter } from './formatters/XmlFormatter';
import { JsonFormatter } from './formatters/JsonFormatter';
import { SkeletonService } from '../infrastructure/SkeletonService';

export class OutputEngine {
  private readonly formatters: Map<string, IFormatter>;
  private readonly skeletonService: SkeletonService;

  constructor(skeletonService: SkeletonService) {
    this.skeletonService = skeletonService;
    this.formatters = new Map<string, IFormatter>([
      ['markdown', new MarkdownFormatter()],
      ['xml', new XmlFormatter()],
      ['json', new JsonFormatter()]
    ]);
  }

  public generate(
    files: { path: string; content: string }[],
    options: OutputOptions,
    prompt?: string
  ): OutputResult {
    // 確実にファイルが処理されるよう、早期リターンを避ける
    const targetFiles = (options.skeletonMode && files.length > 0)
      ? this.applySkeleton(files) 
      : files;

    const formatter = this.getFormatter(options.format);
    const content = formatter.format(targetFiles, options, prompt);
    
    // もし結果が空（改行のみ）なら、最低限の情報を付与する（保険）
    const finalContent = content.trim() === '' ? this.fallbackFormat(targetFiles) : content;
    
    return new OutputResult(finalContent, options.format);
  }

  private fallbackFormat(files: { path: string; content: string }[]): string {
    return files.map(f => `## File: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n');
  }

  private getFormatter(format: string): IFormatter {
    return this.formatters.get(format) || this.formatters.get('markdown')!;
  }

  private applySkeleton(files: { path: string; content: string }[]): { path: string; content: string }[] {
    return files.map(f => ({
      path: f.path,
      content: this.skeletonService.generateSkeleton(f.path, f.content)
    }));
  }
}
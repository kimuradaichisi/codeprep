import { OutputOptions } from './OutputOptions';
import { OutputResult } from './OutputResult';
import { generateTree } from '../../../utils/treeGenerator';

export class OutputEngine {
  public generate(
    files: { path: string; content: string }[],
    options: OutputOptions,
    prompt?: string
  ): OutputResult {
    let content = '';
    switch (options.format) {
      case 'xml':
        content = this.generateXML(files, options, prompt);
        break;
      case 'json':
        content = this.generateJSON(files, options, prompt);
        break;
      default:
        content = this.generateMarkdown(files, options, prompt);
        break;
    }
    return new OutputResult(content, options.format);
  }

  private generateMarkdown(
    files: { path: string; content: string }[],
    options: OutputOptions,
    prompt?: string
  ): string {
    const allContent = files.map(f => f.content).join('\n');
    const delimiter = this.getSafeDelimiter(allContent);
    let output = prompt ? `${prompt}\n\n` : '';

    if (options.includeMetadata) {
      output += `## Directory Structure\n${delimiter}\n`;
      const paths = options.outputMode === 'structureOnly' 
        ? this.getDirectoryPaths(files) 
        : files.map(f => f.path);
      output += generateTree(paths) + `${delimiter}\n\n`;
    }

    if (options.outputMode === 'everything') {
      output += this.generateMarkdownContent(files, options, delimiter);
    }

    return output.trimEnd() + '\n';
  }

  private getDirectoryPaths(files: { path: string }[]): string[] {
    const dirs = new Set<string>();
    files.forEach(f => {
      const parts = f.path.split(/[\\/]/);
      if (parts.length > 1) dirs.add(parts.slice(0, -1).join('/'));
    });
    return Array.from(dirs);
  }

  private generateMarkdownContent(
    files: { path: string; content: string }[],
    options: OutputOptions,
    delimiter: string
  ): string {
    return files.map(file => {
      let content = file.content;
      if (options.removeComments) content = this.stripComments(content);
      if (!options.includeEmptyLines) content = this.stripEmptyLines(content);
      
      return `## File: ${file.path}\n${delimiter}\n${content}\n${delimiter}\n`;
    }).join('\n');
  }

  private stripComments(content: string): string {
    return content
      .replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1')
      .replace(/^\s*#.*$/gm, '');
  }

  private stripEmptyLines(content: string): string {
    return content.split(/\r?\n/).filter(line => line.trim() !== '').join('\n');
  }

  private getSafeDelimiter(content: string): string {
    const matches = content.match(/`+/g);
    if (!matches) return '```';
    const maxTicks = Math.max(...matches.map(m => m.length));
    return '`'.repeat(Math.max(3, maxTicks + 1));
  }

  private generateXML(files: { path: string; content: string }[], options: OutputOptions, prompt?: string): string {
    let output = '<repository>\n';
    if (prompt) {
      output += `  <instruction>\n${this.escapeXml(prompt)}\n  </instruction>\n`;
    }
    output += `  <structure>\n${generateTree(files.map(f => f.path))}\n  </structure>\n`;
    output += files.map(f => `  <file path="${f.path}">\n${this.escapeXml(f.content)}\n  </file>`).join('\n');
    return output + '\n</repository>\n';
  }

  private generateJSON(files: { path: string; content: string }[], options: OutputOptions, prompt?: string): string {
    return JSON.stringify({
      prompt: prompt || '',
      structure: generateTree(files.map(f => f.path)),
      repository: files.map(f => ({ path: f.path, content: f.content }))
    }, null, 2) + '\n';
  }

  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, c => ({
      '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
    }[c] as string));
  }
}

import { OutputOptions } from '../OutputOptions';
import { IFormatter } from './IFormatter';

export abstract class BaseFormatter implements IFormatter {
    abstract format(files: { path: string; content: string }[], options: OutputOptions, prompt?: string): string;

    protected getProcessedContent(file: { content: string }, options: OutputOptions): string {
        const sizeKB = file.content.length / 1024;
        if (options.maxFileSizeKB && sizeKB > options.maxFileSizeKB) {
            return `[WARNING] File size exceeds ${options.maxFileSizeKB}KB. Content omitted for performance.`;
        }

        let content = file.content;
        if (options.removeComments) content = this.stripComments(content);
        if (!options.includeEmptyLines) content = this.stripEmptyLines(content);
        return content;
    }

    private stripComments(content: string): string {
        return content
            .replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1')
            .replace(/^\s*#.*$/gm, '');
    }

    private stripEmptyLines(content: string): string {
        return content.split(/\r?\n/).filter(line => line.trim() !== '').join('\n');
    }

    protected getDirectoryPaths(files: { path: string }[]): string[] {
        const dirs = new Set<string>();
        files.forEach(f => {
            const parts = f.path.split(/[\\/]/);
            if (parts.length > 1) dirs.add(parts.slice(0, -1).join('/'));
        });
        return Array.from(dirs);
    }
}

import { OutputOptions } from '../OutputOptions';
import { BaseFormatter } from './BaseFormatter';
import { generateTree } from '../../../../utils/treeGenerator';

export class MarkdownFormatter extends BaseFormatter {
    public format(files: { path: string; content: string }[], options: OutputOptions, prompt?: string): string {
        const delimiter = this.getSafeDelimiter(files.map(f => f.content).join('\n'));
        let output = prompt ? `${prompt}\n\n` : '';
        if (options.includeMetadata) {
            output += this.generateMetadata(files, options, delimiter);
        }
        if (options.outputMode === 'everything') {
            output += this.generateContent(files, options, delimiter);
        }
        return output.trimEnd() + '\n';
    }

    private generateMetadata(files: { path: string; content: string }[], options: OutputOptions, delimiter: string): string {
        const paths = options.outputMode === 'structureOnly' 
            ? this.getDirectoryPaths(files) 
            : files.map(f => f.path);
        return `## Directory Structure\n${delimiter}\n${generateTree(paths)}${delimiter}\n\n`;
    }



    private generateContent(files: { path: string; content: string }[], options: OutputOptions, delimiter: string): string {
        return files.map(file => {
            const content = this.getProcessedContent(file, options);
            return `## File: ${file.path}\n${delimiter}\n${content}\n${delimiter}\n`;
        }).join('\n');
    }

    private getSafeDelimiter(content: string): string {
        const matches = content.match(/`+/g);
        if (!matches) return '```';
        const maxTicks = Math.max(...matches.map(m => m.length));
        return '`'.repeat(Math.max(3, maxTicks + 1));
    }
}

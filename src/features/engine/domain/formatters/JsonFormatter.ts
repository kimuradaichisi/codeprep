import { OutputOptions } from '../OutputOptions';
import { BaseFormatter } from './BaseFormatter';
import { generateTree } from '../../../../utils/treeGenerator';

export class JsonFormatter extends BaseFormatter {
    public format(files: { path: string; content: string }[], options: OutputOptions, prompt?: string): string {
        return JSON.stringify({
            prompt: prompt || '',
            structure: generateTree(files.map(f => f.path)),
            repository: files.map(f => ({
                path: f.path,
                content: this.getProcessedContent(f, options)
            }))
        }, null, 2) + '\n';
    }
}

import { OutputOptions } from '../OutputOptions';
import { BaseFormatter } from './BaseFormatter';
import { generateTree } from '../../../../utils/treeGenerator';

export class XmlFormatter extends BaseFormatter {
    public format(files: { path: string; content: string }[], options: OutputOptions, prompt?: string): string {
        let output = '<repository>\n';
        if (prompt) {
            output += `  <instruction>\n${this.escapeXml(prompt)}\n  </instruction>\n`;
        }
        output += `  <structure>\n${generateTree(files.map(f => f.path))}\n  </structure>\n`;
        output += files.map(f => {
            const content = this.getProcessedContent(f, options);
            return `  <file path="${f.path}">\n${this.escapeXml(content)}\n  </file>`;
        }).join('\n');
        return output + '\n</repository>\n';
    }

    private escapeXml(unsafe: string): string {
        return unsafe.replace(/[<>&'"]/g, c => ({
            '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
        }[c] as string));
    }
}

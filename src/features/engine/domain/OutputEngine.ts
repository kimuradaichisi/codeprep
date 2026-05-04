import { OutputOptions } from './OutputOptions';
import { OutputResult } from './OutputResult';
import { IFormatter } from './formatters/IFormatter';
import { MarkdownFormatter } from './formatters/MarkdownFormatter';
import { XmlFormatter } from './formatters/XmlFormatter';
import { JsonFormatter } from './formatters/JsonFormatter';

export class OutputEngine {
    private readonly formatters: Map<string, IFormatter>;

    constructor() {
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
        const formatter = this.formatters.get(options.format) || this.formatters.get('markdown')!;
        const content = formatter.format(files, options, prompt);
        return new OutputResult(content, options.format);
    }
}

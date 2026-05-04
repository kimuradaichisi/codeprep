import { OutputOptions } from '../OutputOptions';

export interface IFormatter {
    format(files: { path: string; content: string }[], options: OutputOptions, prompt?: string): string;
}

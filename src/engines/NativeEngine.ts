import * as vscode from 'vscode';
import { IEngine } from './IEngine';
import * as path from 'path';
import { generateTree } from '../utils/treeGenerator';

export class NativeEngine implements IEngine {
    public async generate(files: { path: string; content: string }[], prompt?: string): Promise<string> {
        const config = vscode.workspace.getConfiguration('codeprep');
        const format = config.get<string>('outputFormat', 'markdown');
        
        if (format === 'xml') {
            return this.generateXML(files, prompt);
        } else if (format === 'json') {
            return this.generateJSON(files, prompt);
        }

        // Markdown Format (Default)
        return this.generateMarkdown(files, prompt);
    }

    private generateMarkdown(files: { path: string; content: string }[], prompt?: string): string {
        const config = vscode.workspace.getConfiguration('codeprep');
        const outputMode = config.get<string>('outputMode', 'everything');
        const includeMetadata = config.get<boolean>('includeMetadata', true);

        let output = '';

        if (prompt) {
            output += `${prompt}\n\n`;
        }

        if (includeMetadata) {
            output += '## Directory Structure\n';
            output += '```\n';
            
            let pathsToTree = files.map(f => f.path);
            if (outputMode === 'structureOnly') {
                const dirPaths = new Set<string>();
                files.forEach(f => {
                    const dirname = path.dirname(f.path);
                    if (dirname !== '.') {
                        dirPaths.add(dirname);
                    }
                });
                pathsToTree = Array.from(dirPaths);
            }
            
            output += generateTree(pathsToTree);
            output += '```\n\n';
        }

        if (outputMode === 'everything') {
            output += this.generateMarkdownContent(files);
        }

        return output.trimEnd() + '\n';
    }



    private generateMarkdownContent(files: { path: string; content: string }[]): string {
        const config = vscode.workspace.getConfiguration('codeprep');
        const removeComments = config.get<boolean>('nativeEngine.removeComments', false);
        const includeEmptyLines = config.get<boolean>('nativeEngine.includeEmptyLines', true);
        const newLine = '\n';

        return files.map(file => {
            let content = file.content;
            if (removeComments) {
                content = content.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1').replace(/^\s*#.*$/gm, '');
            }
            if (!includeEmptyLines) {
                content = content.split(/\r?\n/).filter(line => line.trim() !== '').join(newLine);
            }
            const delimiter = this.getSafeDelimiter(content);
            return `## File: ${file.path}\n${delimiter}\n${content}\n${delimiter}\n`;
        }).join(newLine);
    }

    private getSafeDelimiter(content: string): string {
        const matches = content.match(/`+/g);
        if (!matches) return '```';
        const maxTicks = Math.max(...matches.map(m => m.length));
        return '`'.repeat(Math.max(3, maxTicks + 1));
    }

    private generateXML(files: { path: string; content: string }[], prompt?: string): string {
        let output = '<repository>\n';
        
        if (prompt) {
            const escapedPrompt = prompt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            output += `  <instruction>\n${escapedPrompt}\n  </instruction>\n`;
        }

        const paths = files.map(f => f.path);
        const tree = generateTree(paths);
        output += `  <structure>\n${tree}\n  </structure>\n`;

        const fileBlocks = files.map(file => {
            const escaped = file.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `  <file path="${file.path}">\n${escaped}\n  </file>`;
        }).join('\n');
        
        output += fileBlocks + '\n</repository>\n';
        return output;
    }

    private generateJSON(files: { path: string; content: string }[], prompt?: string): string {
        const paths = files.map(f => f.path);
        const result = {
            prompt: prompt || '',
            structure: generateTree(paths),
            repository: files.map(f => ({
                path: f.path,
                content: f.content
            }))
        };
        return JSON.stringify(result, null, 2) + '\n';
    }
}

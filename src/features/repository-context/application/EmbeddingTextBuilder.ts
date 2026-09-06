import type { CodeSymbolEntry } from '../domain/CodeSymbolEntry';
import type { MarkdownSectionEntry } from '../domain/MarkdownSectionEntry';
import type { StructuredKnowledgeEntry } from '../domain/StructuredKnowledgeIndex';

export const CURRENT_EMBEDDING_TEXT_FORMAT_VERSION = 1;

function formatSymbolName(entry: CodeSymbolEntry): string {
  return entry.containerName ? `${entry.containerName}.${entry.symbolName}` : entry.symbolName;
}

export class EmbeddingTextBuilder {
  public build(entry: StructuredKnowledgeEntry): string {
    return entry.kind === 'markdown-section'
      ? this.buildMarkdownText(entry)
      : this.buildCodeText(entry);
  }

  public buildQuery(task: string): string {
    return `Task:\n${task.trim()}`;
  }

  private buildMarkdownText(entry: MarkdownSectionEntry): string {
    const sectionPath = entry.headingPath.length > 0 ? entry.headingPath.join(' > ') : '(root)';
    const heading = entry.headingText.trim().length > 0 ? entry.headingText : '(root)';
    return [
      `File: ${entry.relativePath}`,
      `Section: ${sectionPath}`,
      `Heading: ${heading}`,
      '',
      entry.content.trim(),
    ].join('\n');
  }

  private buildCodeText(entry: CodeSymbolEntry): string {
    const lines = [
      `File: ${entry.relativePath}`,
      `Symbol: ${formatSymbolName(entry)}`,
      `Kind: ${entry.symbolKind}`,
      '',
      'Declaration:',
      entry.signature.trim(),
    ];
    if (entry.docComment?.trim()) lines.push('', 'Documentation:', entry.docComment.trim());
    return lines.join('\n');
  }
}

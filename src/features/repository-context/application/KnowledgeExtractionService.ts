import type {
  CodeSymbolExtractorPort,
  KnowledgeFileReaderPort,
  MarkdownSectionExtractorPort,
} from './structuredKnowledgePorts';
import type { StructuredKnowledgeEntry } from '../domain/StructuredKnowledgeIndex';

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown']);

function isMarkdown(path: string): boolean {
  const dotIndex = path.lastIndexOf('.');
  const ext = dotIndex !== -1 ? path.substring(dotIndex).toLowerCase() : '';
  return MARKDOWN_EXTENSIONS.has(ext);
}

export class KnowledgeExtractionService {
  public constructor(
    private readonly markdownExtractor: MarkdownSectionExtractorPort,
    private readonly codeSymbolExtractor: CodeSymbolExtractorPort,
    private readonly fileReader: KnowledgeFileReaderPort
  ) {}

  public async extractForFile(
    projectId: string,
    relativePath: string
  ): Promise<StructuredKnowledgeEntry[]> {
    const isMd = isMarkdown(relativePath);
    const isCode = this.codeSymbolExtractor.supports(relativePath);
    if (!isMd && !isCode) return [];
    try {
      const content = await this.fileReader.readFileContent(projectId, relativePath);
      return this.extractFromContent(projectId, relativePath, content, isMd);
    } catch {
      return [];
    }
  }

  private extractFromContent(
    projectId: string,
    relativePath: string,
    content: string,
    isMd: boolean
  ): StructuredKnowledgeEntry[] {
    return isMd
      ? this.markdownExtractor.extract(projectId, relativePath, content)
      : this.codeSymbolExtractor.extract(projectId, relativePath, content);
  }
}

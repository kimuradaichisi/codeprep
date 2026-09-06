import type { CodeSymbolEntry } from '../domain/CodeSymbolEntry';
import type { MarkdownSectionEntry } from '../domain/MarkdownSectionEntry';
import type { StructuredKnowledgeIndex } from '../domain/StructuredKnowledgeIndex';

/**
 * 構造化ナレッジインデックスの永続化ポート
 */
export interface StructuredKnowledgeIndexStore {
  load(projectId: string): Promise<StructuredKnowledgeIndex | null>;
  save(index: StructuredKnowledgeIndex): Promise<void>;
  remove(projectId: string): Promise<void>;
}

/**
 * Markdown セクション抽出ポート
 */
export interface MarkdownSectionExtractorPort {
  extract(projectId: string, relativePath: string, content: string): MarkdownSectionEntry[];
}

/**
 * コードシンボル抽出ポート
 */
export interface CodeSymbolExtractorPort {
  supports(relativePath: string): boolean;
  extract(projectId: string, relativePath: string, content: string): CodeSymbolEntry[];
}

/**
 * ナレッジ構築用ファイル読み込みポート
 */
export interface KnowledgeFileReaderPort {
  readFileContent(projectId: string, relativePath: string): Promise<string>;
}

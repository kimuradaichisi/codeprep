/**
 * Markdown 見出しセクションの構造化エントリ
 */
export type MarkdownSectionEntry = Readonly<{
  entryId: string;
  projectId: string;
  relativePath: string;
  kind: 'markdown-section';
  headingLevel: number;
  headingText: string;
  headingPath: readonly string[];
  startLine: number;
  endLine: number;
  content: string;
}>;

/**
 * 決定論的 Markdown セクション entryId を生成
 */
export function buildMarkdownSectionEntryId(
  projectId: string,
  relativePath: string,
  headingLevel: number,
  headingPath: readonly string[],
  startLine: number
): string {
  const pathStr = headingPath.length > 0 ? headingPath.join(' > ') : 'root';
  return `${projectId}:${relativePath}#sec:${headingLevel}:${pathStr}:${startLine}`;
}

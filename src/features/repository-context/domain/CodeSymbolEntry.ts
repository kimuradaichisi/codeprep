/**
 * コードシンボルの種類
 */
export type CodeSymbolKind =
  | 'class'
  | 'interface'
  | 'function'
  | 'method'
  | 'type'
  | 'enum'
  | 'constant';

/**
 * コードシンボルの構造化エントリ
 */
export type CodeSymbolEntry = Readonly<{
  entryId: string;
  projectId: string;
  relativePath: string;
  kind: 'code-symbol';
  symbolName: string;
  symbolKind: CodeSymbolKind;
  containerName?: string;
  startLine: number;
  endLine: number;
  signature: string;
  docComment?: string;
}>;

/**
 * 決定論的 CodeSymbol entryId を生成
 */
export function buildCodeSymbolEntryId(
  projectId: string,
  relativePath: string,
  symbolKind: CodeSymbolKind,
  containerName: string | undefined,
  symbolName: string,
  startLine: number
): string {
  const container = containerName && containerName.length > 0 ? `${containerName}.` : '';
  return `${projectId}:${relativePath}#sym:${symbolKind}:${container}${symbolName}:${startLine}`;
}

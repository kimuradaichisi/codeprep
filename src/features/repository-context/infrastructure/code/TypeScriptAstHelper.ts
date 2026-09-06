import ts from 'typescript';

/**
 * ノードの先頭にある JSDoc コメントテキストを取得する
 */
export function extractDocComment(sourceFile: ts.SourceFile, node: ts.Node): string | undefined {
  const fullText = sourceFile.getFullText();
  const ranges = ts.getLeadingCommentRanges(fullText, node.getFullStart());
  if (!ranges || ranges.length === 0) {
    return undefined;
  }
  const lastRange = ranges[ranges.length - 1];
  const comment = fullText.substring(lastRange.pos, lastRange.end).trim();
  return comment.startsWith('/**') ? comment : undefined;
}

/**
 * 簡易シグネチャ文字列を取得する（本体の前まで、最大120文字）
 */
export function extractSignature(sourceFile: ts.SourceFile, node: ts.Node): string {
  const text = node.getText(sourceFile);
  const braceIndex = text.indexOf('{');
  const signatureRaw = braceIndex !== -1 ? text.substring(0, braceIndex) : text;
  const singleLine = signatureRaw.replace(/\s+/g, ' ').trim();
  return singleLine.replace(/;$/, '');
}

/**
 * ノードの開始行と終了行（1-based）を取得する
 */
export function getNodeLines(
  sourceFile: ts.SourceFile,
  node: ts.Node
): { startLine: number; endLine: number } {
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
  return { startLine: start, endLine: end };
}

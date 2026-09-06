export interface HeadingInfo {
  readonly level: number;
  readonly text: string;
}

/**
 * コードフェンスのトグル状態を判定する
 */
export function isFenceLine(line: string): boolean {
  const trimmed = line.trimStart();
  return trimmed.startsWith('```') || trimmed.startsWith('~~~');
}

/**
 * 見出し行かどうかを判定し、見出し情報を返す
 */
export function parseHeadingLine(line: string): HeadingInfo | null {
  const match = /^(#{1,6})\s+(.+)$/.exec(line.trim());
  if (!match) {
    return null;
  }
  return {
    level: match[1].length,
    text: match[2].trim(),
  };
}

/**
 * 見出しスタックを更新し、新しいパス配列を返す
 */
export function updateHeadingStack(
  stack: HeadingInfo[],
  newHeading: HeadingInfo
): string[] {
  while (stack.length > 0 && stack[stack.length - 1].level >= newHeading.level) {
    stack.pop();
  }
  stack.push(newHeading);
  return stack.map((item) => item.text);
}

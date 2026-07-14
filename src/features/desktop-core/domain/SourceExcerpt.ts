export type SourceLine = Readonly<{
  lineNumber: number;
  content: string;
}>;

export type SourceExcerpt = Readonly<{
  startLine: number;
  endLine: number;
  content: string;
}>;

const sortLines = (lines: readonly SourceLine[]): readonly SourceLine[] =>
  [...lines].sort((a, b) => a.lineNumber - b.lineNumber);

const uniqueLines = (lines: readonly SourceLine[]): readonly SourceLine[] => {
  const seen = new Set<number>();
  return lines.filter(line => {
    if (seen.has(line.lineNumber)) return false;
    seen.add(line.lineNumber);
    return true;
  });
};

const appendLine = (excerpt: SourceExcerpt, line: SourceLine): SourceExcerpt => ({
  startLine: excerpt.startLine,
  endLine: line.lineNumber,
  content: excerpt.content + line.content,
});

const toExcerpts = (lines: readonly SourceLine[]): readonly SourceExcerpt[] => {
  if (lines.length === 0) return [];
  const results: SourceExcerpt[] = [];
  let curr = { startLine: lines[0].lineNumber, endLine: lines[0].lineNumber, content: lines[0].content };
  for (const line of lines.slice(1)) {
    if (line.lineNumber === curr.endLine + 1) {
      curr = appendLine(curr, line);
    } else {
      results.push(curr);
      curr = { startLine: line.lineNumber, endLine: line.lineNumber, content: line.content };
    }
  }
  return [...results, curr];
};

export const mergeSourceLines = (lines: readonly SourceLine[]): readonly SourceExcerpt[] =>
  toExcerpts(uniqueLines(sortLines(lines)));

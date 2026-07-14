import { mergeSourceLines, type SourceLine } from '../desktop-core/domain/SourceExcerpt';
import type { RipgrepMatch } from '../desktop-core/application/ports';

type ParsedLine = Readonly<{
  relativePath: string;
  sourceLine?: SourceLine;
}>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getTextPath = (path: unknown): string | undefined =>
  isRecord(path) && typeof path.text === 'string' ? path.text : undefined;

const getTextContent = (lines: unknown): string | undefined =>
  isRecord(lines) && typeof lines.text === 'string' ? lines.text : undefined;

const parseJsonLine = (value: unknown): readonly ParsedLine[] => {
  if (!isRecord(value)) return [];
  const type = value.type;
  if (type !== 'match' && type !== 'context') return [];
  const data = value.data;
  if (!isRecord(data)) return [];
  const path = getTextPath(data.path);
  if (!path) return [];
  const lineNum = data.line_number;
  const text = getTextContent(data.lines);
  const sourceLine = typeof lineNum === 'number' && typeof text === 'string'
    ? { lineNumber: lineNum, content: text }
    : undefined;
  return [{ relativePath: path, sourceLine }];
};

const parseRipgrepLine = (line: string): readonly ParsedLine[] => {
  if (!line.trim()) return [];
  try {
    return parseJsonLine(JSON.parse(line));
  } catch {
    return [];
  }
};

const groupLinesByPath = (lines: readonly ParsedLine[]): Map<string, readonly SourceLine[]> => {
  const map = new Map<string, readonly SourceLine[]>();
  for (const item of lines) {
    const current = map.get(item.relativePath) ?? [];
    const next = item.sourceLine ? [...current, item.sourceLine] : current;
    map.set(item.relativePath, next);
  }
  return map;
};

export const parseRipgrepJson = (output: string): readonly RipgrepMatch[] => {
  const linesByPath = groupLinesByPath(output.split(/\r?\n/).flatMap(parseRipgrepLine));
  return Array.from(linesByPath.entries()).map(([relativePath, lines]) => ({
    relativePath,
    excerpts: mergeSourceLines(lines),
  }));
};


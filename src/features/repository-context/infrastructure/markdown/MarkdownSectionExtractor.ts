import type { MarkdownSectionExtractorPort } from '../../application/structuredKnowledgePorts';
import {
  buildMarkdownSectionEntryId,
  type MarkdownSectionEntry,
} from '../../domain/MarkdownSectionEntry';
import {
  isFenceLine,
  parseHeadingLine,
  updateHeadingStack,
  type HeadingInfo,
} from './MarkdownParserHelper';

interface RawSection {
  level: number;
  text: string;
  path: readonly string[];
  startLine: number;
  lines: string[];
}

function trimTrailingBlankLines(lines: string[]): string[] {
  const result = [...lines];
  while (result.length > 0 && result[result.length - 1].trim() === '') {
    result.pop();
  }
  return result;
}

function finalizeSection(
  raw: RawSection,
  projectId: string,
  relativePath: string
): MarkdownSectionEntry | null {
  const trimmed = trimTrailingBlankLines(raw.lines);
  if (trimmed.length === 0 && raw.text === '') {
    return null;
  }
  const endLine = trimmed.length > 0 ? raw.startLine + trimmed.length - 1 : raw.startLine;
  const entryId = buildMarkdownSectionEntryId(
    projectId,
    relativePath,
    raw.level,
    raw.path,
    raw.startLine
  );
  return {
    entryId,
    projectId,
    relativePath,
    kind: 'markdown-section',
    headingLevel: raw.level,
    headingText: raw.text,
    headingPath: raw.path,
    startLine: raw.startLine,
    endLine,
    content: trimmed.join('\n'),
  };
}

export class MarkdownSectionExtractor implements MarkdownSectionExtractorPort {
  extract(projectId: string, relativePath: string, content: string): MarkdownSectionEntry[] {
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    const sections: MarkdownSectionEntry[] = [];
    const stack: HeadingInfo[] = [];
    let inFence = false;
    let current: RawSection | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      if (isFenceLine(line)) {
        inFence = !inFence;
      }
      const heading = !inFence ? parseHeadingLine(line) : null;
      if (heading) {
        if (current) {
          const entry = finalizeSection(current, projectId, relativePath);
          if (entry) sections.push(entry);
        }
        const path = updateHeadingStack(stack, heading);
        current = { level: heading.level, text: heading.text, path, startLine: lineNum, lines: [line] };
      } else if (current) {
        current.lines.push(line);
      } else if (line.trim() !== '') {
        current = { level: 0, text: '', path: [], startLine: lineNum, lines: [line] };
      }
    }
    if (current) {
      const entry = finalizeSection(current, projectId, relativePath);
      if (entry) sections.push(entry);
    }
    return sections;
  }
}

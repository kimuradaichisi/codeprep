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

interface LineProcessingContext {
  inFence: boolean;
  current: RawSection | null;
  readonly stack: HeadingInfo[];
  readonly sections: MarkdownSectionEntry[];
  readonly projectId: string;
  readonly relativePath: string;
}

function processMarkdownLine(line: string, lineNum: number, ctx: LineProcessingContext): void {
  if (isFenceLine(line)) ctx.inFence = !ctx.inFence;
  const heading = !ctx.inFence ? parseHeadingLine(line) : null;
  if (heading) {
    if (ctx.current) {
      const entry = finalizeSection(ctx.current, ctx.projectId, ctx.relativePath);
      if (entry) ctx.sections.push(entry);
    }
    const path = updateHeadingStack(ctx.stack, heading);
    ctx.current = { level: heading.level, text: heading.text, path, startLine: lineNum, lines: [line] };
  } else if (ctx.current) {
    ctx.current.lines.push(line);
  } else if (line.trim() !== '') {
    ctx.current = { level: 0, text: '', path: [], startLine: lineNum, lines: [line] };
  }
}

export class MarkdownSectionExtractor implements MarkdownSectionExtractorPort {
  extract(projectId: string, relativePath: string, content: string): MarkdownSectionEntry[] {
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    const ctx: LineProcessingContext = { inFence: false, current: null, stack: [], sections: [], projectId, relativePath };
    for (let i = 0; i < lines.length; i++) {
      processMarkdownLine(lines[i], i + 1, ctx);
    }
    if (ctx.current) {
      const entry = finalizeSection(ctx.current, projectId, relativePath);
      if (entry) ctx.sections.push(entry);
    }
    return ctx.sections;
  }
}

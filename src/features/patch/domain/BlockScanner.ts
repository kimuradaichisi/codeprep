/*
 * Copyright 2026 CodePrep Contributors
 */
export interface CodeBlock {
  startPos: number;
  endPos: number;
  contentStart: number;
  contentEnd: number;
  tickCount: number;
}

export class BlockScanner {
  public collectCodeBlocks(markdown: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    let pos = 0;

    while (pos < markdown.length) {
      const start = this.findStart(markdown, pos);
      if (!start) break;

      const end = this.findEnd(markdown, start.contentStart, start.tickCount);
      if (!end) break;

      blocks.push({ ...start, endPos: end.endPos, contentEnd: end.startPos });
      pos = end.endPos;
    }
    return blocks;
  }

  private findStart(md: string, pos: number) {
    for (let i = pos; i < md.length - 2; i++) {
      if (md[i] !== '`') continue;
      let count = 0;
      while (i + count < md.length && md[i + count] === '`') count++;
      
      if (count >= 3) {
        return this.createBlockStart(md, i, count);
      }
    }
    return null;
  }

  private createBlockStart(md: string, i: number, count: number) {
    let contentStart = i + count;
    // 言語識別子（ts, json等）をスキップして改行まで進む
    while (contentStart < md.length && md[contentStart] !== '\n' && md[contentStart] !== '\r') {
      contentStart++;
    }
    // 改行コード自体をスキップ
    if (md[contentStart] === '\r') contentStart++;
    if (md[contentStart] === '\n') contentStart++;
    
    return { startPos: i, contentStart, tickCount: count };
  }

  private findEnd(md: string, start: number, ticks: number) {
    for (let i = start; i <= md.length - ticks; i++) {
      // 終了のバックティックは必ず行頭にある必要がある
      if (i > 0 && md[i - 1] !== '\n' && md[i - 1] !== '\r') continue;

      let match = 0;
      while (match < ticks && md[i + match] === '`') match++;
      
      if (match === ticks && this.isEndOfBlock(md, i + ticks)) {
        return { startPos: i, endPos: this.skipNewlines(md, i + ticks) };
      }
    }
    return null;
  }

  private isEndOfBlock(md: string, pos: number): boolean {
    const next = md[pos] || '\n';
    return /[\n\r \t]/.test(next);
  }

  private skipNewlines(md: string, pos: number): number {
    let end = pos;
    while (end < md.length && (md[end] === '\r' || md[end] === '\n')) end++;
    return end;
  }
}
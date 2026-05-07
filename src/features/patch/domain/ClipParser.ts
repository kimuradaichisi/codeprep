/*
 * Copyright 2026 CodePrep Contributors
 */
import { Result, ok, fail } from '../../../shared/domain/Result';
import { ParsedPatch } from './ParsedPatch';
import { BlockScanner, CodeBlock } from './BlockScanner';
import { PathExtractor } from './PathExtractor';

export class ClipParser {
  private readonly scanner = new BlockScanner();
  private readonly extractor = new PathExtractor();

  public parse(markdown: string): Result<ParsedPatch[]> {
    const blocks = this.scanner.collectCodeBlocks(markdown);
    if (blocks.length === 0) {
      return fail(new Error('No valid code blocks found in markdown.'));
    }

    const patchMap = this.groupBlocksByPath(markdown, blocks);
    return patchMap.size > 0 
      ? ok(this.createPatches(patchMap)) 
      : fail(new Error('No valid patches found in markdown.'));
  }

  private groupBlocksByPath(markdown: string, blocks: CodeBlock[]): Map<string, string[]> {
    const patchMap = new Map<string, string[]>();
    let lastPos = 0;

    for (const block of blocks) {
      const context = markdown.substring(lastPos, block.startPos);
      const filePath = this.extractor.extractPathFromContext(context);

      if (filePath) {
        this.addBlockToMap(patchMap, filePath, markdown, block);
      }
      lastPos = block.endPos;
    }
    return patchMap;
  }

  private addBlockToMap(map: Map<string, string[]>, path: string, md: string, block: CodeBlock): void {
    const code = md.substring(block.contentStart, block.contentEnd).trim();
    const existing = map.get(path) || [];
    existing.push(code);
    map.set(path, existing);
  }

  private createPatches(patchMap: Map<string, string[]>): ParsedPatch[] {
    return Array.from(patchMap.entries()).map(([path, codes]) => {
      const joinedCode = codes.join('\n// ... existing code ...\n');
      return new ParsedPatch(path, joinedCode);
    });
  }
}
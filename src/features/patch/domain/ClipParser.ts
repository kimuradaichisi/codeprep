import { Result, ok, fail } from '../../../shared/domain/Result';
import { ParsedPatch } from './ParsedPatch';

export class ClipParser {
  public parse(markdown: string): Result<ParsedPatch[]> {
    const patchMap = this.collectPatches(markdown);
    const patches = Array.from(patchMap.entries()).map(([path, codes]) => {
      return new ParsedPatch(path, codes.join('\n// ... existing code ...\n'));
    });

    return patches.length > 0 
      ? ok(patches) 
      : fail(new Error('No valid patches found in markdown.'));
  }

  private collectPatches(markdown: string): Map<string, string[]> {
    // 開きバッククォートの後の任意の言語指定と改行を許容し、最短一致で中身を取得
    const blockRegex = /```[^\n]*\r?\n?([\s\S]*?)\r?\n?```/g;
    const patchMap = new Map<string, string[]>();
    let match, lastBlockEnd = 0;

    while ((match = blockRegex.exec(markdown)) !== null) {
      const code = match[1].trim();
      const gap = markdown.substring(lastBlockEnd, match.index);
      const filePath = this.findPathInContext(gap);
      if (filePath) {
        const existing = patchMap.get(filePath) || [];
        patchMap.set(filePath, [...existing, code]);
      }
      lastBlockEnd = blockRegex.lastIndex;
    }
    return patchMap;
  }

  private findPathInContext(context: string): string | null {
    // スペースや記号で区切られた「パスらしき文字列」をすべて抽出
    const regex = /[a-z0-9_./\\@+-]{2,}/gi;
    let lastPath: string | null = null, match;
    while ((match = regex.exec(context)) !== null) {
      const candidate = match[0];
      if (this.isValidPath(candidate)) {
        lastPath = candidate;
      }
    }
    return lastPath;
  }

  private isValidPath(candidate: string): boolean {
    if (/^\d+\.?$/.test(candidate) || candidate.length < 2) return false;
    if (candidate.includes('(') || candidate.includes(')')) return false;

    // 拡張子またはディレクトリ区切りがある場合はパスとみなす
    if (candidate.includes('.') || candidate.includes('/')) return false === /^[A-Z0-9_]+$/.test(candidate);
    
    // 拡張子がない場合: Dockerfile, LICENSE, README, Makefile 等、
    // 大文字で始まり小文字が続く「ファイル名らしい」パターンを許可
    return /^[A-Z][a-z]+/.test(candidate) || ['LICENSE', 'README'].includes(candidate.toUpperCase());
  }
}

import { Result, ok, fail } from '../../../shared/domain/Result';

/**
 * AI が生成した省略（// ... existing code ... 等）を含むコードを
 * 元のコードとマージして復元するドメインサービス
 */
export class OmitHealer {
  private static readonly OMIT_PATTERNS = [
    /^\s*(\/\/|#|--|\/\*|<!--)\s*\.\.\.\s*(existing|original|rest|code|\.\.\.)?/i,
    /^\s*\.\.\.\s*(existing|original|rest|code|\.\.\.)?/i
  ];

  public heal(original: string, patched: string): Result<string> {
    const originalLines = original.split(/\r?\n/), patchLines = patched.split(/\r?\n/);
    const result: string[] = [];
    let searchStartIdx = 0;

    for (let i = 0; i < patchLines.length; i++) {
      const line = patchLines[i];
      const res = this.processLine(line, patchLines, originalLines, i, searchStartIdx, result);
      if (res.isFailure) return fail(res.error);
      i = res.value.nextI;
      searchStartIdx = res.value.nextSearchIdx;
    }
    return ok(result.join('\n'));
  }

  private processLine(line: string, pLines: string[], oLines: string[], i: number, sIdx: number, res: string[]): Result<{ nextI: number, nextSearchIdx: number }> {
    if (this.isOmitLine(line)) {
      return this.handleOmit(pLines, oLines, i, sIdx, res);
    }
    const normalRes = this.handleNormal(line, oLines, sIdx, res);
    if (normalRes.isFailure) return fail(normalRes.error);
    return ok({ nextI: i, nextSearchIdx: normalRes.value });
  }

  private handleOmit(pLines: string[], oLines: string[], i: number, sIdx: number, res: string[]): Result<{ nextI: number, nextSearchIdx: number }> {
    const anchor = this.findFirstAnchor(pLines, i + 1, oLines, sIdx);
    if (anchor) {
      this.adjustAnchor(anchor, pLines, oLines, i, sIdx);
      res.push(...oLines.slice(sIdx, anchor.originalIdx));
      res.push(...pLines.slice(i + 1, anchor.patchIdx));
      return ok({ nextI: anchor.patchIdx - 1, nextSearchIdx: anchor.originalIdx });
    }
    // アンカーが一切見つからない場合は、省略記法が不正な（または古すぎる）コンテキストに基づいているため失敗とする
    const nextLine = this.findNextNonOmitLine(pLines, i + 1);
    if (nextLine) return fail(new Error(`Anchor line not found after omit block: "${nextLine.trim().substring(0, 50)}..."`));
    
    res.push(...oLines.slice(sIdx));
    return ok({ nextI: pLines.length, nextSearchIdx: oLines.length });
  }

  private adjustAnchor(anchor: { patchIdx: number, originalIdx: number }, pLines: string[], oLines: string[], i: number, sIdx: number): void {
    while (anchor.patchIdx > i + 1 && anchor.originalIdx > sIdx && 
           this.normalize(pLines[anchor.patchIdx - 1]) === this.normalize(oLines[anchor.originalIdx - 1])) {
      anchor.patchIdx--;
      anchor.originalIdx--;
    }
  }

  private findFirstAnchor(patchLines: string[], startPatchIdx: number, originalLines: string[], searchStartIdx: number) {
    for (let j = startPatchIdx; j < patchLines.length; j++) {
      if (this.isOmitLine(patchLines[j])) continue;
      const foundIdx = this.findBestMatch(patchLines[j], j, patchLines, originalLines, searchStartIdx);
      if (foundIdx !== -1) return { patchIdx: j, originalIdx: foundIdx };
    }
    return null;
  }

  private findBestMatch(line: string, pIdx: number, pLines: string[], oLines: string[], start: number): number {
    let bestIdx = -1, maxScore = -1;
    const norm = this.normalize(line);
    if (norm === '') return -1;
    for (let i = start; i < oLines.length; i++) {
      const score = this.calculateSimilarityScore(line, oLines[i], pIdx, pLines, i, oLines);
      if (score >= maxScore && score >= 0.8) {
        maxScore = score;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  private calculateSimilarityScore(pLine: string, oLine: string, pIdx: number, pLines: string[], oIdx: number, oLines: string[]): number {
    const similarity = this.calculateSimilarity(pLine, oLine);
    if (similarity < 0.8) return 0;
    let score = similarity;
    for (let k = 1; k <= 2; k++) {
      if (pIdx + k < pLines.length && oIdx + k < oLines.length &&
          this.normalize(pLines[pIdx + k]) === this.normalize(oLines[oIdx + k])) {
        score += 1.0;
      }
    }
    return score;
  }

  private calculateSimilarity(s1: string, s2: string): number {
    const n1 = this.normalize(s1), n2 = this.normalize(s2);
    const longer = n1.length > n2.length ? n1 : n2;
    const shorter = n1.length > n2.length ? n2 : n1;
    if (longer.length === 0) return 1.0;
    const distance = this.levenshtein(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshtein(s1: string, s2: string): number {
    const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
    for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
    for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;
    for (let j = 1; j <= s2.length; j += 1) {
      for (let i = 1; i <= s1.length; i += 1) {
        const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(track[j][i - 1] + 1, track[j - 1][i] + 1, track[j - 1][i - 1] + indicator);
      }
    }
    return track[s2.length][s1.length];
  }

  private handleNormal(line: string, oLines: string[], sIdx: number, res: string[]): Result<number> {
    const foundIdx = this.findLineInOriginal(oLines, line, sIdx);
    if (foundIdx !== -1) {
      res.push(oLines[foundIdx]);
      return ok(foundIdx + 1);
    }
    // コンテキスト行が見つからない場合は、新規行として追加して継続
    res.push(line);
    return ok(sIdx);
  }

  private isOmitLine(line: string): boolean {
    return line ? OmitHealer.OMIT_PATTERNS.some(p => p.test(line)) : false;
  }

  private findNextNonOmitLine(lines: string[], start: number): string | null {
    for (let i = start; i < lines.length; i++) {
      if (lines[i] && !this.isOmitLine(lines[i]) && lines[i].trim() !== '') return lines[i];
    }
    return null;
  }

  private findLineInOriginal(lines: string[], target: string, start: number): number {
    const normalizedTarget = this.normalize(target);
    if (normalizedTarget === '') return -1;

    for (let i = Math.max(0, start); i < lines.length; i++) {
      if (this.normalize(lines[i]) === normalizedTarget) return i;
    }
    return -1;
  }

  private normalize(text: string | undefined | null): string {
    if (!text) return '';
    // 前後の空白削除 + 行途中の空白をすべて除去して比較を強固にする
    return text.trim().replace(/\s+/g, '');
  }
}

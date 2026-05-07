/*
 * Copyright 2026 CodePrep Contributors
 */
import { Result, ok, fail } from '../../../shared/domain/Result';
import { HealerUtils } from './HealerUtils';

export class OmitHealer {
  private static readonly OMIT_PATTERNS = [
    /^\s*(\/\/|#|--|\/\*|<!--)\s*\.\.\.\s*(existing|original|rest|code|\.\.\.)?/i,
    /^\s*\.\.\.\s*(existing|original|rest|code|\.\.\.)?/i
  ];

  public heal(original: string, patched: string): Result<string> {
    const oLines = original.split(/\r?\n/), pLines = patched.split(/\r?\n/);
    const result: string[] = [];
    let sIdx = 0;

    for (let i = 0; i < pLines.length; i++) {
      const res = this.processLine(pLines[i], pLines, oLines, i, sIdx, result);
      if (res.isFailure) return fail(res.error);
      i = res.value.nextI;
      sIdx = res.value.nextSearchIdx;
    }
    return ok(result.join('\n'));
  }

  private processLine(line: string, pL: string[], oL: string[], i: number, sIdx: number, res: string[]): Result<{ nextI: number, nextSearchIdx: number }> {
    if (this.isOmitLine(line)) return this.handleOmit(pL, oL, i, sIdx, res);
    const foundIdx = this.findLineInOriginal(oL, line, sIdx);
    res.push(foundIdx !== -1 ? oL[foundIdx] : line);
    return ok({ nextI: i, nextSearchIdx: foundIdx !== -1 ? foundIdx + 1 : sIdx });
    }

  private handleOmit(pL: string[], oL: string[], i: number, sIdx: number, res: string[]): Result<{ nextI: number, nextSearchIdx: number }> {
    const anchor = this.findFirstAnchor(pL, i + 1, oL, sIdx);
    if (!anchor) {
      const nextLine = this.findNextNonOmitLine(pL, i + 1);
      if (nextLine) return fail(new Error(`Anchor line not found: "${nextLine}"`));
      res.push(...oL.slice(sIdx));
      return ok({ nextI: pL.length, nextSearchIdx: oL.length });
  }
    this.adjustAnchor(anchor, pL, oL, i, sIdx);
    res.push(...oL.slice(sIdx, anchor.originalIdx), ...pL.slice(i + 1, anchor.patchIdx));
      return ok({ nextI: anchor.patchIdx - 1, nextSearchIdx: anchor.originalIdx });
    }

  private adjustAnchor(a: { patchIdx: number, originalIdx: number }, pL: string[], oL: string[], i: number, sIdx: number): void {
    while (a.patchIdx > i + 1 && a.originalIdx > sIdx && 
           HealerUtils.normalize(pL[a.patchIdx - 1]) === HealerUtils.normalize(oL[a.originalIdx - 1])) {
      a.patchIdx--;
      a.originalIdx--;
  }
    }

  private findFirstAnchor(pL: string[], start: number, oL: string[], sIdx: number) {
    for (let j = start; j < pL.length; j++) {
      if (this.isOmitLine(pL[j])) continue;
      const foundIdx = this.findBestMatch(pL[j], j, pL, oL, sIdx);
      if (foundIdx !== -1) return { patchIdx: j, originalIdx: foundIdx };
    }
    return null;
  }

  private findBestMatch(line: string, pIdx: number, pL: string[], oL: string[], start: number): number {
    let bestIdx = -1, maxScore = -1;
    if (HealerUtils.normalize(line) === '') return -1;
    for (let i = start; i < oL.length; i++) {
      const score = this.calculateMatchScore(line, oL[i], pIdx, pL, i, oL);
      if (score >= maxScore && score >= 0.8) { maxScore = score; bestIdx = i; }
      }
    return bestIdx;
  }

  private calculateMatchScore(pLine: string, oLine: string, pIdx: number, pL: string[], oIdx: number, oL: string[]): number {
    const similarity = HealerUtils.calculateSimilarity(pLine, oLine);
    if (similarity < 0.8) return 0;
    let score = similarity;
    for (let k = 1; k <= 2; k++) {
      if (pIdx + k < pL.length && oIdx + k < oL.length &&
          HealerUtils.normalize(pL[pIdx + k]) === HealerUtils.normalize(oL[oIdx + k])) {
        score += 1.0;
      }
    }
    return score;
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
    const normT = HealerUtils.normalize(target);
    if (normT === '') return -1;
    for (let i = Math.max(0, start); i < lines.length; i++) {
      if (HealerUtils.normalize(lines[i]) === normT) return i;
    }
    return -1;
  }
  }
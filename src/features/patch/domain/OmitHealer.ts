// src/features/patch/domain/OmitHealer.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import { Result, ok, fail } from '../../../shared/domain/Result';
import { HealerUtils } from './HealerUtils';

export class OmitHealer {
  public heal(original: string, patched: string): Result<{ code: string, diffRatio: number }> {
    const oL = original.split(/\r?\n/), pL = patched.split(/\r?\n/);
    const result: string[] = []
    let curO = 0;

    for (let i = 0; i < pL.length; i++) {
      if (HealerUtils.isOmitLine(pL[i])) {
        const anchor = this.findNextOriginalAnchor(pL, i + 1, oL, curO);
        if (anchor) {
          result.push(...oL.slice(curO, anchor.oIdx));
          
          for (let j = i + 1; j < anchor.pIdx; j++) {
            if (HealerUtils.isOmitLine(pL[j])) continue;
            if (pL[j].trim() === '' && result.length > 0 && result[result.length - 1].trim() === '') {
              continue;
            }
            result.push(pL[j]);
          }
          
          if (HealerUtils.normalize(oL[anchor.oIdx]) === HealerUtils.normalize(pL[anchor.pIdx])) {
            result.push(oL[anchor.oIdx]); // 完全一致の場合はオリジナルのフォーマットを維持
          } else {
            // Fuzzy matchの場合、変更内容はパッチのものを優先し、インデントのみオリジナルを引き継ぐ
            const originalIndent = oL[anchor.oIdx].match(/^\s*/)?.[0] || '';
            result.push(originalIndent + pL[anchor.pIdx].trimStart());
          }
          
          curO = anchor.oIdx + 1;
          i = anchor.pIdx;
        } else if (!this.hasMoreOmits(pL, i)) {
          // これ以上省略がない場合は、残りのオリジナル行を全て採用しパッチは末尾に追記とみなす
          result.push(...oL.slice(curO));
          curO = oL.length;
        } else {
          return fail(new Error(`Anchor line not found: ${this.getMissingLine(pL, i)}`));
        }
      } else {
        const m = this.findLineInOriginalExact(oL, pL[i], curO, 5);
        if (m !== -1) {
          result.push(oL[m]); // フォーマット維持のためオリジナルを採用
          curO = m + 1;
        } else {
          result.push(pL[i]);
        }
      }
    }
    const code = result.join('\n');
    const diffRatio = oL.length === 0 ? (code.length === 0 ? 0 : 2) : Math.abs(oL.length - result.length) / oL.length;
    return ok({ code, diffRatio });
  }

  private findNextOriginalAnchor(pL: string[], pStart: number, oL: string[], oStart: number) {
    // Pass 1: Gap (スキップ行) が発生するものを優先して完全一致検索
    for (let i = pStart; i < pL.length; i++) {
      if (HealerUtils.isOmitLine(pL[i])) continue;
      const normT = HealerUtils.normalize(pL[i]);
      if (!normT) continue;
      
      let oIdx = -1;
      // まず Gap > 0 のマッチを探す
      for (let k = oStart + 1; k < oL.length; k++) {
        if (HealerUtils.normalize(oL[k]) === normT) {
          oIdx = k;
          break;
        }
      }
      // 見つからなければ Gap == 0 の直後マッチを許可
      if (oIdx === -1 && oStart < oL.length && HealerUtils.normalize(oL[oStart]) === normT) {
        oIdx = oStart;
      }
      
      if (oIdx !== -1) return { oIdx, pIdx: i };
    }

    // Pass 2: 完全一致がない場合は、変更された行と推測してあいまい検索 (Fuzzy match)
    for (let i = pStart; i < pL.length; i++) {
      if (HealerUtils.isOmitLine(pL[i])) continue;
      const normT = HealerUtils.normalize(pL[i]);
      if (!normT || normT.length < 4) continue;

      let bestSim = 0;
      let bestIdx = -1;
      for (let k = oStart; k < oL.length; k++) {
        const sim = HealerUtils.calculateSimilarity(oL[k], pL[i]);
        if (sim > bestSim) {
          bestSim = sim;
          bestIdx = k;
        }
      }
      if (bestSim >= 0.8) return { oIdx: bestIdx, pIdx: i };
    }

    return null;
  }

  private findLineInOriginalExact(lines: string[], target: string, start: number, limit?: number): number {
    const normT = HealerUtils.normalize(target);
    if (!normT) return -1;
    const end = limit ? Math.min(start + limit, lines.length) : lines.length;
    for (let i = start; i < end; i++) {
      if (HealerUtils.normalize(lines[i]) === normT) return i;
    }
    return -1;
  }

  private hasMoreOmits(pL: string[], idx: number): boolean {
    return pL.slice(idx + 1).some(l => HealerUtils.isOmitLine(l));
  }

  private getMissingLine(pL: string[], idx: number): string {
    const next = pL.slice(idx + 1).find(l => !HealerUtils.isOmitLine(l));
    return next || 'End of file';
  }
}

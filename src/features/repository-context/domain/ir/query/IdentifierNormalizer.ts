// src/features/repository-context/domain/ir/query/IdentifierNormalizer.ts
/*
 * Copyright 2026 CodePrep Contributors
 */

export interface NormalizedIdentifier {
  readonly raw: string;
  readonly normalized: string;
  readonly tokens: readonly string[];
}

const COMMON_STOP_WORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'and', 'or', 'is', 'are', 'was', 'were', 'be', 'been', 'this', 'that',
  'from', 'as', 'into', 'not', 'it', 'its', 'their', 'we', 'you',
  'の', 'に', 'を', 'は', 'が', 'で', 'と', 'て', 'た', 'な', 'も', 'へ',
]);

export class IdentifierNormalizer {
  public static normalize(rawText: string): NormalizedIdentifier {
    const raw = rawText.trim();
    const tokens = this.extractTokens(raw);
    const normalized = tokens.join(' ').toLowerCase();
    return Object.freeze({ raw, normalized, tokens: Object.freeze(tokens) });
  }

  // eslint-disable-next-line no-control-regex
  private static readonly NON_ASCII_RE_1 = /([a-zA-Z0-9])([^\x00-\x7F])/g;
  // eslint-disable-next-line no-control-regex
  private static readonly NON_ASCII_RE_2 = /([^\x00-\x7F])([a-zA-Z0-9])/g;

  private static separateCjkAndAscii(text: string): string {
    return text
      .replace(this.NON_ASCII_RE_1, '$1 $2')
      .replace(this.NON_ASCII_RE_2, '$1 $2');
  }

  public static extractTokens(text: string): readonly string[] {
    const separated = this.separateCjkAndAscii(text);
    const splitBySymbols = separated.split(/[\s,.;:!?/\\()[\]{}'"・、。、「」『』（）〜~_\-+=*&^%$#@|<>]+/);
    const result: string[] = [];

    for (const segment of splitBySymbols) {
      if (segment.length < 2) continue;
      const trimmed = this.trimJapaneseParticles(segment.trim());
      if (trimmed.length < 2 || COMMON_STOP_WORDS.has(trimmed.toLowerCase())) continue;

      // 元の識別子を保持
      result.push(trimmed);

      const subTokens = this.splitAcronymAndCamel(trimmed);
      if (subTokens.length > 1) {
        for (const t of subTokens) {
          const lower = t.toLowerCase();
          if (lower.length >= 2 && !COMMON_STOP_WORDS.has(lower)) {
            result.push(lower);
          }
        }
      }
    }
    return Object.freeze(Array.from(new Set(result)));
  }

  public static extractComponentTokens(text: string): readonly string[] {
    const stripped = text.replace(/\.[a-zA-Z0-9]+$/, '');
    const separated = this.separateCjkAndAscii(stripped);
    const segments = separated.split(/[\s,.;:!?/\\()[\]{}'"・、。、「」『』（）〜~_\-+=*&^%$#@|<>]+/);
    const result: string[] = [];

    for (const seg of segments) {
      const trimmed = this.trimJapaneseParticles(seg.trim());
      if (trimmed.length < 2 || COMMON_STOP_WORDS.has(trimmed.toLowerCase())) continue;
      const subTokens = this.splitAcronymAndCamel(trimmed);
      for (const t of subTokens) {
        const lower = t.toLowerCase();
        if (lower.length >= 2 && !COMMON_STOP_WORDS.has(lower)) {
          result.push(lower);
        }
      }
    }
    return Object.freeze(Array.from(new Set(result)));
  }

  private static trimJapaneseParticles(word: string): string {
    let result = word.replace(/^[の・を・に・へ・で・と・が・は・て]+/g, '');
    const particles = ['する', 'した', 'される', 'できる', 'など', 'の', 'を', 'に', 'へ', 'で', 'と', 'が', 'は', '等', 'から', 'まで'];
    for (const p of particles) {
      if (result.length > p.length + 1 && result.endsWith(p)) {
        result = result.slice(0, -p.length);
        break;
      }
    }
    return result;
  }

  public static splitAcronymAndCamel(word: string): readonly string[] {
    // 例: "BuildRepositoryIRUseCase" -> ["Build", "Repository", "IR", "Use", "Case"]
    // 1. Acronym 境界: "IRUseCase" -> "IR", "Use", "Case"
    // 2. 一般 Camel: "RepositoryIndex" -> "Repository", "Index"
    const step1 = word.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
    const step2 = step1.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
    return step2.split(/\s+/).filter(w => w.length > 0);
  }

  public static isStopWord(word: string): boolean {
    return COMMON_STOP_WORDS.has(word.toLowerCase());
  }
}

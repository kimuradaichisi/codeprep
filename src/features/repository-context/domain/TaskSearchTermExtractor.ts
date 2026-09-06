// src/features/repository-context/domain/TaskSearchTermExtractor.ts

const QUOTE_REGEX = /["'「『【](.+?)["'」』】]/g;
const PATH_LIKE_REGEX = /[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)+|[a-zA-Z0-9_.-]+\.[a-zA-Z0-9]+/g;
const CODE_IDENTIFIER_REGEX = /[a-zA-Z_][a-zA-Z0-9_.-]*/g;
const CJK_WORD_REGEX = /[\u4E00-\u9FFF\u30A0-\u30FFa-zA-Z0-9_]+/g;

const extractQuotes = (text: string): readonly string[] => {
  const matches: string[] = [];
  let m: RegExpExecArray | null = null;
  while ((m = QUOTE_REGEX.exec(text)) !== null) {
    if (m[1]?.trim()) matches.push(m[1].trim());
  }
  return matches;
};

const extractRegexMatches = (text: string, regex: RegExp): readonly string[] => {
  const found = text.match(regex);
  return found ? found.map((t) => t.trim()) : [];
};

const STOP_WORDS = new Set(['and', 'the', 'for', 'with', 'from', 'into', 'about', 'this', 'that']);

const isValidTerm = (term: string): boolean => {
  if (!term || term.length < 2) return false;
  if (STOP_WORDS.has(term.toLowerCase())) return false;
  // ひらがなのみで構成された短い助詞や接続語は除外
  if (/^[\u3040-\u309F]+$/.test(term) && term.length <= 2) return false;
  return true;
};

const deduplicateAndFilter = (terms: readonly string[]): readonly string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const term of terms) {
    const cleaned = term.trim().replace(/^[.,:;!?'"()[\]{}]+|[.,:;!?'"()[\]{}]+$/g, '');
    if (!isValidTerm(cleaned) || seen.has(cleaned.toLowerCase())) continue;
    seen.add(cleaned.toLowerCase());
    result.push(cleaned);
  }
  return Object.freeze(result);
};

export const extractTaskSearchTerms = (task: string): readonly string[] => {
  const trimmed = task.trim();
  if (!trimmed) return Object.freeze([]);

  const quotes = extractQuotes(trimmed);
  const pathLikes = extractRegexMatches(trimmed, PATH_LIKE_REGEX);
  const identifiers = extractRegexMatches(trimmed, CODE_IDENTIFIER_REGEX);
  const cjkWords = extractRegexMatches(trimmed, CJK_WORD_REGEX);
  const kanjiChunks = extractRegexMatches(trimmed, /[\u4E00-\u9FFF]{2,}/g);

  const rawTerms = [...quotes, ...pathLikes, ...identifiers, ...cjkWords, ...kanjiChunks];
  return deduplicateAndFilter(rawTerms);
};

const stopWords = new Set(['the', 'and', 'for', 'from', 'with', 'document']);
const generalWords = new Set(['api', 'design', 'test']);

export const fileStem = (path: string): string =>
  path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? '';

export const headingTokens = (content: string): readonly string[] =>
  [...content.matchAll(/^#{1,6}\s+(.+)$/gm)].flatMap(heading => tokenize(heading[1] ?? ''));

export const tokenize = (value: string): readonly string[] => value.toLowerCase()
  .split(/[^a-z0-9]+/).filter(token => token.length >= 3 && !stopWords.has(token));

export const matchesNameOrHeading = (
  sourceTokens: readonly string[],
  path: string,
  content: string | undefined,
): boolean => hasMeaningfulMatch(sourceTokens, candidateTokens(path, content));

export const comparePaths = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const candidateTokens = (path: string, content: string | undefined): ReadonlySet<string> =>
  new Set([...tokenize(fileStem(path)), ...headingTokens(content ?? '')]);

const hasMeaningfulMatch = (
  sourceTokens: readonly string[],
  candidateTokens: ReadonlySet<string>,
): boolean => {
  const matchedTokens = sourceTokens.filter(token => candidateTokens.has(token));
  return matchedTokens.length > 0 && !isSingleGeneralWordMatch(matchedTokens);
};

const isSingleGeneralWordMatch = (matchedTokens: readonly string[]): boolean =>
  matchedTokens.length === 1 && generalWords.has(matchedTokens[0] ?? '');
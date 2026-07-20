import type { Project } from '../desktop-core/domain/Project';
import type { FileContentPort } from '../desktop-core/application/ports';
import type { MarkdownRecommendation } from './MarkdownRecommendationClient';
import { comparePaths, fileStem, headingTokens, matchesNameOrHeading, tokenize } from './MarkdownRecommendationMatching';
import { isMarkdownPath, normalizeAvailablePath, normalizePath, resolveLinkTarget } from './MarkdownRecommendationPath';

const markdownLink = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+['"][^'"]*['"])?\)/g;
const wikiLink = /!?\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

type LinkTarget = Readonly<{ rawTarget: string | undefined; extensionless: boolean }>;

export const extractMarkdownRecommendations = (
  content: string,
  sourceRelativePath: string,
  availablePaths: readonly string[],
  markdownContents?: ReadonlyMap<string, string>,
): readonly MarkdownRecommendation[] => {
  const links = extractLinkTargets(content);
  const linkRecommendations = recommendLinks(links, sourceRelativePath, availablePaths);
  return markdownContents ? mergeRecommendations(linkRecommendations,
    extractNameHeadingRecommendations(sourceRelativePath, availablePaths, markdownContents)) : linkRecommendations;
};

export const extractNameHeadingRecommendations = (
  sourceRelativePath: string,
  availablePaths: readonly string[],
  markdownContents: ReadonlyMap<string, string>,
  sourceContent = '',
): readonly MarkdownRecommendation[] => {
  const sourceTokens = [...tokenize(fileStem(sourceRelativePath)), ...headingTokens(sourceContent)];
  return sourceTokens.length === 0 ? [] : availablePaths.map(normalizeAvailablePath)
    .filter(path => isMarkdownPath(path) && path !== normalizeAvailablePath(sourceRelativePath))
    .filter(path => matchesNameOrHeading(sourceTokens, path, markdownContents.get(path))).sort(comparePaths)
    .map(path => recommendation(path, 0.6, `Filename or heading match from ${normalizePath(sourceRelativePath)}`));
};

const extractLinkTargets = (content: string): readonly LinkTarget[] => [
  ...[...content.matchAll(markdownLink)].map(match => ({ rawTarget: match[1], extensionless: false })),
  ...[...content.matchAll(wikiLink)].map(match => ({ rawTarget: match[1], extensionless: true })),
];

const recommendLinks = (
  links: readonly LinkTarget[],
  source: string,
  availablePaths: readonly string[],
): readonly MarkdownRecommendation[] => {
  const paths = new Set(availablePaths.map(normalizeAvailablePath));
  return uniqueLinks(links, source, paths).map(path => recommendation(path, 0.8,
    `Markdown link from ${normalizePath(source)}`));
};

const uniqueLinks = (
  links: readonly LinkTarget[],
  source: string,
  paths: ReadonlySet<string>,
): readonly string[] => [...new Set(links.map(link => resolveLinkTarget(source, link.rawTarget, paths, link.extensionless))
  .filter((path): path is string => path !== undefined))];

const recommendation = (path: string, score: number, detail: string): MarkdownRecommendation => ({
  relativePath: path, score, detail,
});

const mergeRecommendations = (
  links: readonly MarkdownRecommendation[],
  headings: readonly MarkdownRecommendation[],
): readonly MarkdownRecommendation[] => {
  const linked = new Set(links.map(item => item.relativePath));
  return [...links, ...headings.filter(item => !linked.has(item.relativePath))];
};

export const readMarkdownContents = async (
  fileContent: FileContentPort,
  project: Project,
  paths: readonly string[],
): Promise<ReadonlyMap<string, string>> => {
  const entries = await Promise.all(paths.filter(isMarkdownPath).map(async path => {
    const normalized = normalizeAvailablePath(path);
    const content = await fileContent.read(project, normalized);
    return content === undefined ? undefined : [normalized, content] as const;
  }));
  return new Map(entries.flatMap(entry => entry ? [entry] : []));
};
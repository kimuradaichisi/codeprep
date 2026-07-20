import { posix, win32 } from 'node:path';
import type { RecommendationSourcePort } from '../desktop-core/application/ports';
import { createRecommendation, type RecommendationRecord } from '../desktop-core/domain/Recommendation';
import type { Project } from '../desktop-core/domain/Project';
import { nodeProcessRunner, type ProcessRunner } from './RipgrepClient';

export type GitCoChange = Readonly<{ relativePath: string; count: number }>;

const DEFAULT_HISTORY_LIMIT = 50;
const COMMIT_HASH = /^[0-9a-f]{7,40}$/i;

export class GitCoChangeClient implements RecommendationSourcePort {
  public constructor(
    private readonly runner: ProcessRunner = nodeProcessRunner,
    private readonly historyLimit: number = DEFAULT_HISTORY_LIMIT,
  ) {}

  public async recommend(project: Project, relativePath: string): Promise<readonly RecommendationRecord[]> {
    const target = normalizeProjectPath(project.rootPath, relativePath);
    if (!target) return [];
    try {
      const output = await this.runner.run('git', gitArgs(this.historyLimit), project.rootPath);
      if (output.exitCode !== 0) return [];
      return parseGitCoChangeOutput(output.stdout, target, project.rootPath)
        .map(item => toRecommendation(project, item));
    } catch { return []; }
  }
}

export const parseGitCoChangeOutput = (
  output: string,
  targetPath: string,
  rootPath: string,
): readonly GitCoChange[] => {
  const target = normalizeProjectPath(rootPath, targetPath);
  if (!target) return [];
  const counts = new Map<string, number>();
  for (const commit of output.split(/\r?\n\s*\r?\n/)) countCommit(commit, target, rootPath, counts);
  return [...counts.entries()]
    .map(([relativePath, count]) => ({ relativePath, count }))
    .sort((left, right) => right.count - left.count || compare(left.relativePath, right.relativePath));
};

const countCommit = (
  commit: string,
  target: string,
  rootPath: string,
  counts: Map<string, number>,
): void => {
  const lines = commit.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (!isValidCommitHeader(lines[0])) return;
  const paths = lines.slice(1)
    .map(path => normalizeProjectPath(rootPath, path.trim()))
    .filter((path): path is string => path !== undefined);
  if (!paths.includes(target)) return;
  for (const path of new Set(paths)) {
    if (path !== target && isDocumentPath(path)) counts.set(path, (counts.get(path) ?? 0) + 1);
  }
};

const isValidCommitHeader = (header: string | undefined): boolean =>
  header !== undefined && COMMIT_HASH.test(header);

const isDocumentPath = (path: string): boolean => /\.(?:md|markdown|mdx|rst|txt)$/i.test(path);

const toRecommendation = (project: Project, item: GitCoChange): RecommendationRecord => {
  const recommendation = createRecommendation({
    projectId: project.id,
    relativePath: item.relativePath,
    source: 'gitCoChange',
    score: item.count,
    detail: `Changed in ${item.count} shared commit(s)`,
  });
  if (!recommendation) throw new Error('Invalid Git recommendation.');
  return recommendation;
};

const gitArgs = (limit: number): readonly string[] => [
  'log', '--name-only', '--format=%H', '--max-count', String(validLimit(limit)),
];

const validLimit = (limit: number): number => Number.isInteger(limit) && limit > 0 ? limit : DEFAULT_HISTORY_LIMIT;

const normalizeProjectPath = (rootPath: string, candidate: string): string | undefined => {
  const normalized = candidate.replace(/\\/g, '/').trim();
  if (!normalized || normalized === '.' || win32.isAbsolute(normalized)) return undefined;
  const windows = win32.isAbsolute(rootPath);
  const root = windows ? win32.resolve(rootPath) : posix.resolve(rootPath);
  const absolute = windows ? win32.resolve(root, normalized) : posix.resolve(root, normalized);
  const relation = windows ? win32.relative(root, absolute) : posix.relative(root, absolute);
  if (relation.startsWith('..') || (windows ? win32.isAbsolute(relation) : posix.isAbsolute(relation))) return undefined;
  return relation.replace(/\\/g, '/');
};

const compare = (left: string, right: string): number => left < right ? -1 : left > right ? 1 : 0;
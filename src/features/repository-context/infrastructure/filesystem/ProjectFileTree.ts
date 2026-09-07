// src/features/repository-context/infrastructure/filesystem/ProjectFileTree.ts
import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { GitignoreMatcher } from '../../../../shared/filesystem/GitignoreMatcher';
import { DEFAULT_EXCLUDED_PATTERNS } from '../../../../shared/filesystem/defaultExcludes';

export const listProjectFiles = async (
  root: string,
  useGitignore = true
): Promise<readonly string[]> => {
  const matcher = useGitignore
    ? await GitignoreMatcher.fromDirectory(root)
    : new GitignoreMatcher(DEFAULT_EXCLUDED_PATTERNS);
  const files = await walkDirectory(root, root, matcher);
  return [...files].sort((left, right) => left.localeCompare(right));
};

async function walkDirectory(
  root: string,
  current: string,
  matcher: GitignoreMatcher
): Promise<readonly string[]> {
  const entries = await readdir(current, { withFileTypes: true });
  const results = await Promise.all(
    entries.map((entry) => processEntry(root, current, entry, matcher))
  );
  return results.flat();
}

async function processEntry(
  root: string,
  directory: string,
  entry: { name: string; isDirectory(): boolean; isFile(): boolean },
  matcher: GitignoreMatcher
): Promise<readonly string[]> {
  const full = join(directory, entry.name);
  const rel = relative(root, full).replace(/\\/g, '/');
  const isDir = entry.isDirectory();

  if (matcher.isIgnored(rel, isDir)) return [];
  if (isDir) return walkDirectory(root, full, matcher);
  return entry.isFile() ? [rel] : [];
}

// src/features/repository-context/infrastructure/filesystem/ProjectFileTree.ts
import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { Dirent } from 'node:fs';
import { GitignoreMatcher } from '../../../../shared/filesystem/GitignoreMatcher';
import { DEFAULT_EXCLUDED_DIR_NAMES, DEFAULT_EXCLUDED_PATTERNS } from '../../../../shared/filesystem/defaultExcludes';

export type ListProjectFilesOptions = Readonly<{
  useGitignore?: boolean;
  signal?: AbortSignal;
  onProgress?: (count: number) => void;
}>;

type WalkContext = Readonly<{
  root: string;
  matcher: GitignoreMatcher;
  options?: ListProjectFilesOptions;
  state: { count: number };
}>;

export const listProjectFiles = async (
  root: string,
  options: boolean | ListProjectFilesOptions = true
): Promise<readonly string[]> => {
  const opts: ListProjectFilesOptions = typeof options === 'boolean'
    ? { useGitignore: options }
    : options;
  const useGitignore = opts.useGitignore ?? true;
  const matcher = useGitignore
    ? await GitignoreMatcher.fromDirectory(root)
    : new GitignoreMatcher(DEFAULT_EXCLUDED_PATTERNS);
  const context: WalkContext = { root, matcher, options: opts, state: { count: 0 } };
  const files = await walkDirectory(root, context);
  return [...files].sort((left, right) => left.localeCompare(right));
};

async function walkDirectory(
  current: string,
  context: WalkContext
): Promise<readonly string[]> {
  if (context.options?.signal?.aborted) return [];
  const entries = await readdir(current, { withFileTypes: true });
  const results = await Promise.all(
    entries.map((entry) => processEntry(current, entry, context))
  );
  return results.flat();
}

async function processEntry(
  directory: string,
  entry: Dirent,
  context: WalkContext
): Promise<readonly string[]> {
  if (context.options?.signal?.aborted) return [];
  if (entry.isDirectory() && isDefaultExcludedDir(entry.name)) return [];
  const full = join(directory, entry.name);
  const rel = relative(context.root, full).replace(/\\/g, '/');
  const isDir = entry.isDirectory();

  if (context.matcher.isIgnored(rel, isDir)) return [];
  if (isDir) return walkDirectory(full, context);
  return handleFileEntry(entry, rel, context);
}

function isDefaultExcludedDir(name: string): boolean {
  return (DEFAULT_EXCLUDED_DIR_NAMES as readonly string[]).includes(name);
}

function handleFileEntry(entry: Dirent, rel: string, context: WalkContext): readonly string[] {
  if (!entry.isFile()) return [];
  context.state.count++;
  if (context.options?.onProgress && context.state.count % 20 === 0) {
    context.options.onProgress(context.state.count);
  }
  return [rel];
}

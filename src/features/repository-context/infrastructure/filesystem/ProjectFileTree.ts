// src/features/repository-context/infrastructure/filesystem/ProjectFileTree.ts
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
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
  const files = await walkDirectory(root, '', context, 0);
  return [...files].sort((left, right) => left.localeCompare(right));
};

async function walkDirectory(
  current: string,
  currentRel: string,
  context: WalkContext,
  depth: number
): Promise<readonly string[]> {
  if (context.options?.signal?.aborted || depth > 30) return [];
  const entries = await readSafeEntries(current);
  const files: string[] = [];
  const dirs: { name: string; full: string; rel: string }[] = [];

  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const rel = currentRel ? `${currentRel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (!isDefaultExcludedDir(entry.name) && !context.matcher.isIgnored(rel, true)) {
        dirs.push({ name: entry.name, full: join(current, entry.name), rel });
      }
    } else if (entry.isFile() && !context.matcher.isIgnored(rel, false)) {
      files.push(rel);
      notifyProgress(context);
    }
  }

  const subResults = await Promise.all(
    dirs.map((d) => walkDirectory(d.full, d.rel, context, depth + 1))
  );
  return [...files, ...subResults.flat()];
}

async function readSafeEntries(dir: string): Promise<readonly Dirent[]> {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function isDefaultExcludedDir(name: string): boolean {
  return (DEFAULT_EXCLUDED_DIR_NAMES as readonly string[]).includes(name);
}

function notifyProgress(context: WalkContext): void {
  context.state.count++;
  if (context.options?.onProgress && (context.state.count % 10 === 0 || context.state.count <= 20)) {
    context.options.onProgress(context.state.count);
  }
}

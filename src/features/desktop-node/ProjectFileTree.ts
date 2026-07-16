import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const excluded = new Set(['.git', 'node_modules', 'dist', 'out', '.next']);

export const listProjectFiles = async (root: string, useGitignore = true): Promise<readonly string[]> => {
  const patterns = useGitignore ? await loadGitignore(root) : [];
  return [...await walk(root, root, patterns)].sort((left, right) => left.localeCompare(right));
};

const loadGitignore = async (root: string): Promise<readonly RegExp[]> => {
  try {
    const content = await readFile(join(root, '.gitignore'), 'utf8');
    return content.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('!')).map(p => {
      let escaped = p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]');
      return new RegExp(`(^|/)${escaped.endsWith('/') ? escaped.slice(0, -1) : escaped}(/|$)`);
    });
  } catch {
    return [];
  }
};

const walk = async (root: string, directory: string, patterns: readonly RegExp[]): Promise<readonly string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(entries.filter(e => !excluded.has(e.name)).map(async entry => {
    const full = join(directory, entry.name);
    const rel = relative(root, full).replace(/\\/g, '/');
    if (patterns.some(rx => rx.test(rel))) return [];
    return entry.isDirectory() ? walk(root, full, patterns) : [rel];
  }));
  return paths.flat();
};

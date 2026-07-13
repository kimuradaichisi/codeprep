import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const excluded = new Set(['.git', 'node_modules', 'dist', 'out', '.next']);

export const listProjectFiles = async (root: string): Promise<readonly string[]> =>
  [...await walk(root, root)].sort((left, right) => left.localeCompare(right));

const walk = async (root: string, directory: string): Promise<readonly string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(entries.filter(entry => !excluded.has(entry.name)).map(entry => readEntry(root, directory, entry)));
  return paths.flat();
};

const readEntry = async (root: string, directory: string, entry: import('node:fs').Dirent): Promise<readonly string[]> => {
  const path = join(directory, entry.name);
  if (entry.isDirectory()) return walk(root, path);
  return [relative(root, path).replace(/\\/g, '/')];
};

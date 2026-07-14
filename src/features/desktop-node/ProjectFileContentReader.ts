import { access, readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import type { Project } from '../desktop-core/domain/Project';

export const getProjectFileSize = async (
  project: Project,
  relativePath: string,
): Promise<number> => {
  const path = await resolveReadableProjectFile(project.rootPath, relativePath);
  if (!path) return 0;
  try { const s = await stat(path); return s.size; } catch { return 0; }
};

export const canReadProjectFile = async (
  project: Project,
  relativePath: string,
): Promise<boolean> => {
  const path = await resolveReadableProjectFile(project.rootPath, relativePath);
  if (!path) return false;
  try { await access(path); return true; } catch { return false; }
};

export const readProjectFile = async (
  project: Project,
  relativePath: string,
): Promise<string | undefined> => {
  const path = await resolveReadableProjectFile(project.rootPath, relativePath);
  if (!path) return undefined;
  try { return await readFile(path, 'utf8'); } catch { return undefined; }
};

export const resolveProjectFile = (
  rootPath: string,
  relativePath: string,
): string | undefined => {
  const root = resolve(rootPath);
  const path = resolve(root, relativePath);
  const relation = relative(root, path);
  return relation.startsWith('..') || isAbsolute(relation) ? undefined : path;
};

const resolveReadableProjectFile = async (
  rootPath: string,
  relativePath: string,
): Promise<string | undefined> => {
  const path = resolveProjectFile(rootPath, relativePath);
  if (!path) return undefined;
  try { return containedPath(await realpath(rootPath), await realpath(path)); }
  catch { return undefined; }
};

const containedPath = (root: string, path: string): string | undefined => {
  const relation = relative(root, path);
  return relation.startsWith('..') || isAbsolute(relation) ? undefined : path;
};

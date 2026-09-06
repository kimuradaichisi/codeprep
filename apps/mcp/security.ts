// apps/mcp/security.ts
import { isAbsolute, relative, resolve } from 'path';
import { realpath } from 'fs/promises';

export class PathSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PathSecurityError';
  }
}

export function sanitizeWorkspacePath(rawPath: string): string {
  const trimmed = rawPath.trim();
  if (!trimmed) throw new PathSecurityError('Workspace path cannot be empty');
  return resolve(trimmed);
}

function assertNotAbsolute(trimmed: string, targetPath: string): void {
  if (!trimmed) throw new PathSecurityError('Path cannot be empty');
  if (isAbsolute(trimmed) || /^[a-zA-Z]:/.test(trimmed)) {
    throw new PathSecurityError('Absolute paths are not permitted: ' + targetPath);
  }
}

function assertNotEscape(rel: string, targetPath: string): void {
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new PathSecurityError('Path traversal detected outside workspace: ' + targetPath);
  }
}

export function validateLexicalRelativePath(workspaceRoot: string, targetPath: string): string {
  const trimmed = targetPath.trim().replace(/\\/g, '/');
  assertNotAbsolute(trimmed, targetPath);
  const root = resolve(workspaceRoot);
  const rel = relative(root, resolve(root, trimmed)).replace(/\\/g, '/');
  assertNotEscape(rel, targetPath);
  return rel;
}

export async function validateSafeRelativePath(workspaceRoot: string, targetPath: string): Promise<string> {
  const rel = validateLexicalRelativePath(workspaceRoot, targetPath);
  const rootFull = resolve(workspaceRoot);
  const targetFull = resolve(rootFull, rel);
  try {
    const rootReal = (await realpath(rootFull)).replace(/\\/g, '/');
    const targetReal = (await realpath(targetFull)).replace(/\\/g, '/');
    const realRel = relative(rootReal, targetReal).replace(/\\/g, '/');
    assertNotEscape(realRel, targetPath);
  } catch (err) {
    if (err instanceof PathSecurityError) throw err;
  }
  return rel;
}

export async function validateSafeRelativePaths(workspaceRoot: string, targetPaths: readonly string[]): Promise<string[]> {
  const results: string[] = [];
  for (const p of targetPaths) results.push(await validateSafeRelativePath(workspaceRoot, p));
  return results;
}

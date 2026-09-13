/*
 * Copyright 2026 CodePrep Contributors
 */
import { resolve } from 'path';

export function sanitizeWorkspacePath(rawPath: string): string {
  const trimmed = rawPath.trim();
  if (!trimmed) throw new Error('Workspace path cannot be empty');
  return resolve(trimmed);
}

/*
 * Copyright 2026 CodePrep Contributors
 */
import * as path from 'path';

export function normalizeSeparators(p: string): string {
  return p.replace(/\\/g, '/');
}

export function isAbsoluteCandidate(normalized: string): boolean {
  return /^(\/)?[a-zA-Z]:\//.test(normalized) || normalized.startsWith('/');
}

export function extractWorkspaceRelativePath(candidate: string, workspaceRoot: string): string | undefined {
  const normCand = normalizeSeparators(candidate).trim();
  const normRoot = normalizeSeparators(workspaceRoot).replace(/\/+$/, '');

  const absRel = resolveAbsoluteToRelative(normCand, normRoot);
  if (absRel !== undefined) return absRel;

  if (isStrictlyOutsideAbsolute(normCand, normRoot)) return undefined;

  return resolveRelativeToWorkspace(normCand);
}

function resolveAbsoluteToRelative(normCand: string, normRoot: string): string | undefined {
  const cleanCand = normCand.replace(/^\/([a-zA-Z]:)/, '$1');
  const cleanRoot = normRoot.replace(/^\/([a-zA-Z]:)/, '$1');

  const lowerCand = cleanCand.toLowerCase();
  const lowerRoot = cleanRoot.toLowerCase();

  if (lowerCand === lowerRoot) return '';
  if (lowerCand.startsWith(lowerRoot + '/')) {
    return cleanCand.slice(cleanRoot.length + 1);
  }
  return undefined;
}

function isStrictlyOutsideAbsolute(normCand: string, normRoot: string): boolean {
  if (/^(\/)?[a-zA-Z]:\//.test(normCand)) return true;
  if (normRoot.startsWith('/') && normCand.startsWith('/')) return true;
  return false;
}

function resolveRelativeToWorkspace(normCand: string): string | undefined {
  const clean = normCand.replace(/^(\.\/|\/)+/, '');
  if (!clean) return undefined;

  const segments = clean.split('/');
  let depth = 0;
  for (const s of segments) {
    if (s === '..') {
      depth--;
      if (depth < 0) return undefined;
    } else if (s !== '.' && s !== '') {
      depth++;
    }
  }
  return path.posix.normalize(clean);
}

export function isEligibleForFallback(candidate: string): boolean {
  const norm = normalizeSeparators(candidate).trim();
  if (/^(\/)?[a-zA-Z]:\//.test(norm)) return false;
  return resolveRelativeToWorkspace(norm) !== undefined;
}

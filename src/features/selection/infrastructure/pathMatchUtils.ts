/*
 * Copyright 2026 CodePrep Contributors
 */
import * as path from 'path';

export function normalizeSeparators(p: string): string {
  return p.replace(/\\/g, '/');
}

export function isAbsoluteCandidate(normalized: string): boolean {
  return /^(\/)?[a-zA-Z]:\//.test(normalized) || normalized.startsWith('/') || /^\/\/(?:wsl\$|wsl\.localhost)/i.test(normalized);
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
  const direct = matchPrefix(normCand, normRoot);
  if (direct !== undefined) return direct;

  const candLinux = toLinuxPathIfWsl(normCand);
  const rootLinux = toLinuxPathIfWsl(normRoot);
  if (candLinux !== normCand || rootLinux !== normRoot) {
    return matchPrefix(candLinux, rootLinux);
  }
  return undefined;
}

function matchPrefix(cand: string, root: string): string | undefined {
  const cleanCand = cand.replace(/^\/([a-zA-Z]:)/, '$1');
  const cleanRoot = root.replace(/^\/([a-zA-Z]:)/, '$1');
  const lowerCand = cleanCand.toLowerCase();
  const lowerRoot = cleanRoot.toLowerCase();

  if (lowerCand === lowerRoot) return '';
  if (lowerCand.startsWith(lowerRoot + '/')) {
    return cleanCand.slice(cleanRoot.length + 1);
  }
  return undefined;
}

function toLinuxPathIfWsl(p: string): string {
  return p.replace(/^\/\/(?:wsl\$|wsl\.localhost)\/[^/]+/i, '');
}

function isStrictlyOutsideAbsolute(normCand: string, normRoot: string): boolean {
  if (/^(\/)?[a-zA-Z]:\//.test(normCand)) return true;
  const candLinux = toLinuxPathIfWsl(normCand);
  const rootLinux = toLinuxPathIfWsl(normRoot);
  if (rootLinux.startsWith('/') && candLinux.startsWith('/')) return true;
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

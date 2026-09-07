// src/shared/filesystem/GitignoreMatcher.ts
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_EXCLUDED_PATTERNS } from './defaultExcludes';

export type GitignoreRule = Readonly<{
  negated: boolean;
  dirOnly: boolean;
  regex: RegExp;
  ancestorRegex: RegExp;
}>;

export class GitignoreMatcher {
  private readonly rules: readonly GitignoreRule[];

  constructor(patterns: readonly string[]) {
    this.rules = Object.freeze(parsePatterns(patterns));
  }

  public static async fromDirectory(
    dir: string,
    extra: readonly string[] = DEFAULT_EXCLUDED_PATTERNS
  ): Promise<GitignoreMatcher> {
    const lines = await readLines(join(dir, '.gitignore'));
    return new GitignoreMatcher([...extra, ...lines]);
  }

  public isIgnored(relativePath: string, isDirectory: boolean): boolean {
    const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalized) return false;

    let ignored = false;
    for (const rule of this.rules) {
      if (matchesRule(normalized, isDirectory, rule)) {
        ignored = !rule.negated;
      }
    }
    return ignored;
  }
}

function matchesRule(path: string, isDir: boolean, rule: GitignoreRule): boolean {
  if (isDir) return rule.regex.test(path);
  if (rule.dirOnly) return rule.ancestorRegex.test(path);
  return rule.regex.test(path);
}

function parsePatterns(patterns: readonly string[]): GitignoreRule[] {
  const rules: GitignoreRule[] = [];
  for (const raw of patterns) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    rules.push(buildRule(trimmed));
  }
  return rules;
}

function buildRule(pattern: string): GitignoreRule {
  const negated = pattern.startsWith('!');
  const body = negated ? pattern.slice(1).trim() : pattern;
  const dirOnly = body.endsWith('/');
  const clean = dirOnly ? body.slice(0, -1) : body;
  const rootRelative = clean.startsWith('/');
  const rawBody = rootRelative ? clean.slice(1) : clean;
  const escaped = escapeGlob(rawBody);
  const prefix = rootRelative ? '^' : '(?:^|/)';

  const regex = new RegExp(`${prefix}${escaped}(?:/.*)?$`);
  const ancestorRegex = new RegExp(`${prefix}${escaped}/.*$`);
  return { negated, dirOnly, regex, ancestorRegex };
}

function escapeGlob(body: string): string {
  return body
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '___GLOBSTAR___')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/___GLOBSTAR___\//g, '(?:.*/)?')
    .replace(/___GLOBSTAR___/g, '.*');
}

async function readLines(filePath: string): Promise<readonly string[]> {
  try {
    const raw = await readFile(filePath, 'utf8');
    return raw.split(/\r?\n/);
  } catch {
    return [];
  }
}


// src/shared/filesystem/__tests__/GitignoreMatcher.test.ts
import { describe, expect, it } from 'vitest';
import { GitignoreMatcher } from '../GitignoreMatcher';

describe('GitignoreMatcher', () => {
  it('ignores matching files and skips comments/empty lines', () => {
    const matcher = new GitignoreMatcher([
      '# Comment line',
      '',
      '*.log',
      'temp.txt',
    ]);

    expect(matcher.isIgnored('app.log', false)).toBe(true);
    expect(matcher.isIgnored('src/error.log', false)).toBe(true);
    expect(matcher.isIgnored('temp.txt', false)).toBe(true);
    expect(matcher.isIgnored('src/temp.txt', false)).toBe(true);
    expect(matcher.isIgnored('src/main.ts', false)).toBe(false);
  });

  it('handles directory-only patterns with trailing slash', () => {
    const matcher = new GitignoreMatcher(['venv/', 'node_modules/']);

    expect(matcher.isIgnored('venv', true)).toBe(true);
    expect(matcher.isIgnored('venv/lib/site.py', false)).toBe(true);
    expect(matcher.isIgnored('node_modules', true)).toBe(true);
    expect(matcher.isIgnored('node_modules/package/index.js', false)).toBe(true);
    expect(matcher.isIgnored('venv', false)).toBe(false); // file with same name
  });

  it('handles root-relative patterns with leading slash', () => {
    const matcher = new GitignoreMatcher(['/build', '/outputs/']);

    expect(matcher.isIgnored('build', true)).toBe(true);
    expect(matcher.isIgnored('build/bundle.js', false)).toBe(true);
    expect(matcher.isIgnored('outputs/report.csv', false)).toBe(true);
    expect(matcher.isIgnored('src/build', true)).toBe(false);
    expect(matcher.isIgnored('src/build/test.js', false)).toBe(false);
  });

  it('handles negation rules properly', () => {
    const matcher = new GitignoreMatcher([
      'data/*',
      '!data/.gitkeep',
    ]);

    expect(matcher.isIgnored('data/prices.db', false)).toBe(true);
    expect(matcher.isIgnored('data/raw.csv', false)).toBe(true);
    expect(matcher.isIgnored('data/.gitkeep', false)).toBe(false);
  });

  it('normalizes Windows backslashes automatically', () => {
    const matcher = new GitignoreMatcher(['.venv/']);

    expect(matcher.isIgnored('.venv\\Scripts\\python.exe', false)).toBe(true);
    expect(matcher.isIgnored('.venv', true)).toBe(true);
  });

  it('loads patterns from directory and applies defaults', async () => {
    const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');

    const tempDir = await mkdtemp(join(tmpdir(), 'cp-test-'));
    try {
      await writeFile(join(tempDir, '.gitignore'), 'custom-cache/\n*.secret');
      const matcher = await GitignoreMatcher.fromDirectory(tempDir);

      // Default excludes
      expect(matcher.isIgnored('.venv', true)).toBe(true);
      expect(matcher.isIgnored('node_modules', true)).toBe(true);
      // Custom patterns from .gitignore
      expect(matcher.isIgnored('custom-cache/file.tmp', false)).toBe(true);
      expect(matcher.isIgnored('api.secret', false)).toBe(true);
      expect(matcher.isIgnored('src/index.ts', false)).toBe(false);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('excludes sensitive files by default while keeping .env.example, sample, template', async () => {
    const { tmpdir } = await import('node:os');
    const { mkdtemp, rm } = await import('node:fs/promises');
    const { join } = await import('node:path');

    const tempDir = await mkdtemp(join(tmpdir(), 'cp-sensitive-'));
    try {
      const matcher = await GitignoreMatcher.fromDirectory(tempDir);

      // Sensitive files must be ignored
      expect(matcher.isIgnored('.env', false)).toBe(true);
      expect(matcher.isIgnored('.env.local', false)).toBe(true);
      expect(matcher.isIgnored('.env.production', false)).toBe(true);
      expect(matcher.isIgnored('.env.development', false)).toBe(true);
      expect(matcher.isIgnored('.env.test', false)).toBe(true);
      expect(matcher.isIgnored('server.pem', false)).toBe(true);
      expect(matcher.isIgnored('sub/private.key', false)).toBe(true);
      expect(matcher.isIgnored('cert.p12', false)).toBe(true);
      expect(matcher.isIgnored('cert.pfx', false)).toBe(true);
      expect(matcher.isIgnored('id_rsa', false)).toBe(true);
      expect(matcher.isIgnored('.ssh/id_ed25519', false)).toBe(true);

      // Template and example files must NOT be ignored
      expect(matcher.isIgnored('.env.example', false)).toBe(false);
      expect(matcher.isIgnored('.env.sample', false)).toBe(false);
      expect(matcher.isIgnored('.env.template', false)).toBe(false);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

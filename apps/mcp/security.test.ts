// apps/mcp/security.test.ts
import { mkdtemp, rm, writeFile, symlink, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  PathSecurityError,
  sanitizeWorkspacePath,
  validateLexicalRelativePath,
  validateSafeRelativePath,
  validateSafeRelativePaths,
} from './security';

describe('security: path & realpath validation', () => {
  let testRoot: string;
  let outsideDir: string;
  let repoDir: string;

  beforeEach(async () => {
    testRoot = await mkdtemp(join(tmpdir(), 'codeprep-sec-'));
    outsideDir = join(testRoot, 'outside');
    repoDir = join(testRoot, 'repo');
    await mkdir(outsideDir, { recursive: true });
    await mkdir(join(repoDir, 'src'), { recursive: true });
    await writeFile(join(outsideDir, 'secret.txt'), 'secret data');
    await writeFile(join(repoDir, 'src/index.ts'), 'console.log( hello);');
  });

  afterEach(async () => {
    try {
      await rm(testRoot, { recursive: true, force: true });
    } catch (_err) {
      // Ignore cleanup error on Windows temp locking
    }
  });

  it('sanitizes valid workspace path', () => {
    expect(sanitizeWorkspacePath('  /app/work  ')).toBe(resolve('/app/work'));
  });

  it('rejects empty workspace path', () => {
    expect(() => sanitizeWorkspacePath('')).toThrow(PathSecurityError);
  });

  it('validates safe relative paths lexically', () => {
    expect(validateLexicalRelativePath(repoDir, 'src/index.ts')).toBe('src/index.ts');
  });

  it('rejects lexical ../ escape', async () => {
    await expect(validateSafeRelativePath(repoDir, '../secret.txt')).rejects.toThrow(PathSecurityError);
    await expect(validateSafeRelativePath(repoDir, 'src/../../outside/secret.txt')).rejects.toThrow(PathSecurityError);
  });

  it('rejects absolute outside path', async () => {
    await expect(validateSafeRelativePath(repoDir, '/etc/passwd')).rejects.toThrow(PathSecurityError);
    await expect(validateSafeRelativePath(repoDir, 'C:\\Windows\\system32')).rejects.toThrow(PathSecurityError);
  });

  it('allows normal symlink staying inside repository', async () => {
    const symlinkTarget = join(repoDir, 'src/index.ts');
    const symlinkPath = join(repoDir, 'link-index.ts');
    try {
      await symlink(symlinkTarget, symlinkPath, 'file');
    } catch {
      // OS privileges might deny creating symlinks without admin on Windows
      return;
    }
    const valid = await validateSafeRelativePath(repoDir, 'link-index.ts');
    expect(valid).toBe('link-index.ts');
  });

  it('rejects symlink inside repository pointing to file outside repository', async () => {
    const symlinkTarget = join(outsideDir, 'secret.txt');
    const symlinkPath = join(repoDir, 'escape-link.txt');
    try {
      await symlink(symlinkTarget, symlinkPath, 'file');
    } catch {
      // Skip if OS restricts symlink creation
      return;
    }
    await expect(validateSafeRelativePath(repoDir, 'escape-link.txt')).rejects.toThrow(PathSecurityError);
  });

  it('rejects directory symlink pointing outside repository', async () => {
    const symlinkTarget = outsideDir;
    const symlinkPath = join(repoDir, 'outside-dir-link');
    try {
      await symlink(symlinkTarget, symlinkPath, 'junction');
    } catch {
      // Skip if OS restricts junction creation
      return;
    }
    await expect(validateSafeRelativePath(repoDir, 'outside-dir-link/secret.txt')).rejects.toThrow(PathSecurityError);
  });

  it('validates batch of relative paths safely', async () => {
    const valid = await validateSafeRelativePaths(repoDir, ['src/index.ts']);
    expect(valid).toEqual(['src/index.ts']);
  });
});

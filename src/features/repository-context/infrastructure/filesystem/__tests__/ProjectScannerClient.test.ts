// src/features/repository-context/infrastructure/filesystem/__tests__/ProjectScannerClient.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { ProjectScannerClient } from '../ProjectScannerClient';
import type { Project } from '../../../domain/Project';

const tempDir = join(__dirname, '../../../../scratch/temp-scanner-test');

describe('ProjectScannerClient', () => {
  beforeEach(async () => {
    await mkdir(tempDir, { recursive: true });
    await mkdir(join(tempDir, 'src'), { recursive: true });
    await mkdir(join(tempDir, '.venv/bin'), { recursive: true });
    await mkdir(join(tempDir, 'node_modules/pkg'), { recursive: true });
    await writeFile(join(tempDir, 'src/index.ts'), 'export const a = 1;');
    await writeFile(join(tempDir, '.venv/bin/activate'), '#!/bin/sh');
    await writeFile(join(tempDir, 'node_modules/pkg/index.js'), 'module.exports = {};');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('scans files while excluding default directories like .venv and node_modules', async () => {
    const scanner = new ProjectScannerClient();
    const project: Project = { id: 'test', name: 'Test', rootPath: tempDir };

    const files = await scanner.scanProjectFiles(project);
    const paths = files.map((f) => f.relativePath);

    expect(paths).toContain('src/index.ts');
    expect(paths).not.toContain('.venv/bin/activate');
    expect(paths).not.toContain('node_modules/pkg/index.js');
  });

  it('respects .gitignore exclusions in project root', async () => {
    await writeFile(join(tempDir, '.gitignore'), 'temp/\n*.secret\n');
    await mkdir(join(tempDir, 'temp'), { recursive: true });
    await writeFile(join(tempDir, 'temp/cache.json'), '{}');
    await writeFile(join(tempDir, 'src/api.secret'), 'TOKEN');

    const scanner = new ProjectScannerClient();
    const project: Project = { id: 'test', name: 'Test', rootPath: tempDir };

    const files = await scanner.scanProjectFiles(project);
    const paths = files.map((f) => f.relativePath);

    expect(paths).toContain('src/index.ts');
    expect(paths).not.toContain('temp/cache.json');
    expect(paths).not.toContain('src/api.secret');
  });

  it('respects additional excludePatterns configured on project', async () => {
    await mkdir(join(tempDir, 'docs'), { recursive: true });
    await writeFile(join(tempDir, 'docs/readme.md'), '# Doc');

    const scanner = new ProjectScannerClient();
    const project: Project = {
      id: 'test',
      name: 'Test',
      rootPath: tempDir,
      excludePatterns: ['docs/'],
    };

    const files = await scanner.scanProjectFiles(project);
    const paths = files.map((f) => f.relativePath);

    expect(paths).toContain('src/index.ts');
    expect(paths).not.toContain('docs/readme.md');
  });
});

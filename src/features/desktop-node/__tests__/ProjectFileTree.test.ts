import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { listProjectFiles } from '../ProjectFileTree';

const tempDir = join(__dirname, '../../../../scratch/temp-tree-test');

describe('ProjectFileTree', () => {
  beforeEach(async () => {
    await mkdir(tempDir, { recursive: true });
    await mkdir(join(tempDir, 'node_modules'), { recursive: true });
    await writeFile(join(tempDir, 'node_modules/a.js'), 'a');
    await writeFile(join(tempDir, 'b.js'), 'b');
    await writeFile(join(tempDir, 'c.log'), 'c');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('lists files and ignores default node_modules', async () => {
    const files = await listProjectFiles(tempDir, false);
    expect(files).toEqual(['b.js', 'c.log']);
  });

  it('respects .gitignore pattern exclusions when useGitignore is true', async () => {
    await writeFile(join(tempDir, '.gitignore'), '*.log\n');
    const files = await listProjectFiles(tempDir, true);
    expect(files).toEqual(['.gitignore', 'b.js']);
  });
});

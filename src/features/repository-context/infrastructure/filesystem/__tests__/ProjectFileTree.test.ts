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

  it('automatically excludes .venv and venv directories by default', async () => {
    await mkdir(join(tempDir, '.venv/lib'), { recursive: true });
    await writeFile(join(tempDir, '.venv/lib/site.py'), 'print(1)');
    const files = await listProjectFiles(tempDir, true);
    expect(files).not.toContain('.venv/lib/site.py');
  });

  it('handles directory patterns and negations from .gitignore', async () => {
    await mkdir(join(tempDir, 'data'), { recursive: true });
    await writeFile(join(tempDir, 'data/raw.csv'), 'raw');
    await writeFile(join(tempDir, 'data/.gitkeep'), '');
    await writeFile(join(tempDir, '.gitignore'), 'data/*\n!data/.gitkeep\n');

    const files = await listProjectFiles(tempDir, true);
    expect(files).toContain('data/.gitkeep');
    expect(files).not.toContain('data/raw.csv');
  });

  it('excludes sensitive files by default but retains .env.example', async () => {
    await writeFile(join(tempDir, '.env'), 'SECRET=123');
    await writeFile(join(tempDir, '.env.local'), 'SECRET=123');
    await writeFile(join(tempDir, '.env.example'), 'SECRET=your_key');
    await writeFile(join(tempDir, 'server.key'), 'KEY_DATA');
    await writeFile(join(tempDir, 'id_rsa'), 'RSA_DATA');

    const files = await listProjectFiles(tempDir, true);
    expect(files).toContain('.env.example');
    expect(files).not.toContain('.env');
    expect(files).not.toContain('.env.local');
    expect(files).not.toContain('server.key');
    expect(files).not.toContain('id_rsa');
  });

  it('stops scanning immediately when aborted by AbortSignal', async () => {
    const controller = new AbortController();
    controller.abort();
    const files = await listProjectFiles(tempDir, { signal: controller.signal });
    expect(files).toEqual([]);
  });

  it('Git リポジトリ直下では高速パス（tryListGitFiles）によりファイル一覧を取得できること', async () => {
    const files = await listProjectFiles(process.cwd(), true);
    expect(files).toContain('package.json');
    expect(files).toContain('src/features/repository-context/infrastructure/filesystem/ProjectFileTree.ts');
    expect(files.some(f => f.startsWith('node_modules/'))).toBe(false);
  });
});

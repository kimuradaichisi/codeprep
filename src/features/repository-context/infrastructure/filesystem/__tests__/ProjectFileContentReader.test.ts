import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readProjectFile, resolveProjectFile } from '../ProjectFileContentReader';

describe('resolveProjectFile', () => {
  it('resolves files inside the project root', () => {
    expect(resolveProjectFile('C:/repo', 'src/app.ts')).toBeTruthy();
  });

  it('rejects traversal outside the project root', () => {
    expect(resolveProjectFile('C:/repo', '../secret.txt')).toBeUndefined();
  });

  it('rejects a symlink that resolves outside the project root', async context => {
    const fixture = await createSymlinkFixture();
    if (!fixture) return context.skip();
    try {
      expect(await readProjectFile({ id: 'p1', name: 'App', rootPath: fixture.root }, 'link.txt')).toBeUndefined();
    } finally {
      await rm(fixture.base, { recursive: true, force: true });
    }
  });
});

const createSymlinkFixture = async (): Promise<Readonly<{ base: string; root: string }> | undefined> => {
  const base = await mkdtemp(join(tmpdir(), 'codeprep-reader-'));
  const root = join(base, 'root');
  const target = join(base, 'secret.txt');
  await mkdir(root);
  await writeFile(target, 'secret');
  try { await symlink(target, join(root, 'link.txt'), 'file'); return { base, root }; }
  catch { await rm(base, { recursive: true, force: true }); return undefined; }
};

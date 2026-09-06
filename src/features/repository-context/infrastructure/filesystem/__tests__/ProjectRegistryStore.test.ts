import { mkdtemp, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { afterEach, describe, expect, it } from 'vitest';
import { ProjectRegistryStore } from '../ProjectRegistryStore';

let tempDir: string | undefined;

const registryPath = async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'codeprep-registry-'));
  return join(tempDir, 'projects.json');
};

afterEach(async () => {
  if (!tempDir) return;
  await rm(tempDir, { recursive: true, force: true });
  tempDir = undefined;
});

describe('ProjectRegistryStore', () => {
  it('treats a missing registry file as an empty list', async () => {
    const store = new ProjectRegistryStore(await registryPath());

    expect(await store.getByIds(['p1'])).toEqual([]);
  });

  it('persists readonly project records to json', async () => {
    const store = new ProjectRegistryStore(await registryPath());
    const project = { id: 'p1', name: 'App', rootPath: '/repo' };

    await store.saveAll([project]);

    expect(await store.getByIds(['p1'])).toEqual([project]);
  });

  it('preserves excludePatterns during persistence', async () => {
    const store = new ProjectRegistryStore(await registryPath());
    const project = { id: 'p1', name: 'App', rootPath: '/repo', excludePatterns: ['dist/**'] };

    await store.saveAll([project]);

    expect(await store.getByIds(['p1'])).toEqual([project]);
  });

  it('returns a malformedRegistry warning for malformed json', async () => {
    const path = await registryPath();
    await writeFile(path, '{bad', 'utf8');

    const result = await new ProjectRegistryStore(path).readAll();

    expect(result.projects).toEqual([]);
    expect(result.warning?.kind).toBe('malformedRegistry');
  });
});

import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { RepositoryIndex } from '../../../domain/RepositoryIndex';
import { JsonRepositoryIndexStore } from '../JsonRepositoryIndexStore';

describe('JsonRepositoryIndexStore', () => {
  let tempDir: string;
  let store: JsonRepositoryIndexStore;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'codeprep-idx-test-'));
    store = new JsonRepositoryIndexStore(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('saves and loads repository index atomically', async () => {
    const index: RepositoryIndex = {
      metadata: { workspaceId: 'ws-1', schemaVersion: 1, createdAt: '2026-09-06T12:00:00Z', updatedAt: '2026-09-06T12:00:00Z' },
      entries: [{ projectId: 'p1', relativePath: 'src/main.ts', kind: 'code', size: 100, contentHash: 'hash1' }],
    };

    await store.save(index);
    const loaded = await store.load('ws-1');

    expect(loaded).toEqual(index);
  });

  it('returns undefined when index file does not exist', async () => {
    const loaded = await store.load('non-existent');
    expect(loaded).toBeUndefined();
  });

  it('returns undefined when JSON is corrupted', async () => {
    const filePath = join(tempDir, 'corrupt_ws.index.json');
    await writeFile(filePath, '{ invalid json', 'utf8');

    const loaded = await store.load('corrupt_ws');
    expect(loaded).toBeUndefined();
  });

  it('returns undefined when schemaVersion is unsupported', async () => {
    const outdated = {
      metadata: { workspaceId: 'ws-old', schemaVersion: 999, createdAt: 't', updatedAt: 't' },
      entries: [],
    };
    const filePath = join(tempDir, 'ws_old.index.json');
    await writeFile(filePath, JSON.stringify(outdated), 'utf8');

    const loaded = await store.load('ws-old');
    expect(loaded).toBeUndefined();
  });

  it('removes index file on remove', async () => {
    const index: RepositoryIndex = {
      metadata: { workspaceId: 'ws-del', schemaVersion: 1, createdAt: 't', updatedAt: 't' },
      entries: [],
    };
    await store.save(index);
    expect(await store.load('ws-del')).toBeDefined();

    await store.remove('ws-del');
    expect(await store.load('ws-del')).toBeUndefined();
  });
});

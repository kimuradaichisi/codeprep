import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NodeCryptoFingerprintClient } from '../NodeCryptoFingerprintClient';

describe('NodeCryptoFingerprintClient', () => {
  let tempDir: string;
  let client: NodeCryptoFingerprintClient;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'codeprep-hash-test-'));
    client = new NodeCryptoFingerprintClient((projectId) => (projectId === 'p1' ? tempDir : undefined));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('computes deterministic sha256 hash for files', async () => {
    const file1 = 'file1.txt';
    const file2 = 'file2.txt';
    await writeFile(join(tempDir, file1), 'hello world', 'utf8');
    await writeFile(join(tempDir, file2), 'hello world', 'utf8');

    const hash1 = await client.computeHash('p1', file1);
    const hash2 = await client.computeHash('p1', file2);

    expect(hash1).toBe(hash2);
    expect(hash1).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });

  it('computes different hash for modified content', async () => {
    const file = 'test.txt';
    await writeFile(join(tempDir, file), 'v1', 'utf8');
    const hashV1 = await client.computeHash('p1', file);

    await writeFile(join(tempDir, file), 'v2', 'utf8');
    const hashV2 = await client.computeHash('p1', file);

    expect(hashV1).not.toBe(hashV2);
  });

  it('throws when project root is unknown', async () => {
    await expect(client.computeHash('unknown-project', 'a.txt')).rejects.toThrow('Project root not found');
  });
});

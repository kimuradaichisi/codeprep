import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CURRENT_KNOWLEDGE_SCHEMA_VERSION, type StructuredKnowledgeIndex } from '../../../domain/StructuredKnowledgeIndex';
import { JsonStructuredKnowledgeIndexStore } from '../JsonStructuredKnowledgeIndexStore';

describe('JsonStructuredKnowledgeIndexStore', () => {
  const testDir = join(__dirname, '.test-knowledge-store');
  let store: JsonStructuredKnowledgeIndexStore;

  const sampleIndex: StructuredKnowledgeIndex = {
    metadata: {
      projectId: 'test-project',
      indexedAt: '2026-03-01T00:00:00.000Z',
      schemaVersion: CURRENT_KNOWLEDGE_SCHEMA_VERSION,
      totalEntries: 1,
      markdownSectionCount: 1,
      codeSymbolCount: 0,
    },
    entries: [
      {
        entryId: 'test-project:doc.md#sec:1:Intro:1',
        projectId: 'test-project',
        relativePath: 'doc.md',
        kind: 'markdown-section',
        headingLevel: 1,
        headingText: 'Intro',
        headingPath: ['Intro'],
        startLine: 1,
        endLine: 5,
        content: '# Intro\nBody',
      },
    ],
  };

  beforeEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    store = new JsonStructuredKnowledgeIndexStore(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('saves and loads structured knowledge index', async () => {
    await store.save(sampleIndex);
    const loaded = await store.load('test-project');

    expect(loaded).toEqual(sampleIndex);
  });

  it('returns null when index file does not exist', async () => {
    const loaded = await store.load('non-existent');
    expect(loaded).toBeNull();
  });

  it('returns null when index file is corrupted or schema version mismatches', async () => {
    await mkdir(testDir, { recursive: true });
    const targetFile = join(testDir, 'corrupt.knowledge.json');

    await writeFile(targetFile, '{ invalid json', 'utf8');
    expect(await store.load('corrupt')).toBeNull();

    await writeFile(
      targetFile,
      JSON.stringify({ metadata: { schemaVersion: 999 }, entries: [] }),
      'utf8'
    );
    expect(await store.load('corrupt')).toBeNull();
  });

  it('removes index file cleanly', async () => {
    await store.save(sampleIndex);
    await store.remove('test-project');
    expect(await store.load('test-project')).toBeNull();
  });
});

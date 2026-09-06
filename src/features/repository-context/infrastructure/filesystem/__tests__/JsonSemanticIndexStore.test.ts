import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SemanticSearchUseCase } from '../../../application/SemanticSearchUseCase';
import {
  CURRENT_SEMANTIC_SCHEMA_VERSION,
  type SemanticIndex,
} from '../../../domain/SemanticIndex';
import { FakeEmbeddingPort } from '../../embedding/FakeEmbeddingPort';
import { JsonSemanticIndexStore } from '../JsonSemanticIndexStore';

describe('JsonSemanticIndexStore', () => {
  const testDir = join(__dirname, '.test-semantic-store');
  let store: JsonSemanticIndexStore;

  const sampleIndex: SemanticIndex = {
    metadata: {
      workspaceId: 'test-workspace',
      schemaVersion: CURRENT_SEMANTIC_SCHEMA_VERSION,
      sourceKnowledgeSchemaVersion: 1,
      embeddingProvider: 'test-prov',
      embeddingModel: 'test-model',
      embeddingDimensions: 2,
      embeddingTextFormatVersion: 1,
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
    entries: [
      {
        projectId: 'p',
        relativePath: 'a.md',
        knowledgeEntryId: 'k1',
        knowledgeKind: 'markdown-section',
        vector: new Float32Array([1, 0]),
        embeddingTextHash: 'h1',
      },
      {
        projectId: 'p',
        relativePath: 'b.ts',
        knowledgeEntryId: 'k2',
        knowledgeKind: 'code-symbol',
        vector: new Float32Array([0, 1]),
        embeddingTextHash: 'h2',
      },
    ],
  };

  beforeEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    store = new JsonSemanticIndexStore(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('saves and loads semantic index restoring Float32Array', async () => {
    await store.save(sampleIndex);
    const loaded = await store.load('test-workspace');
    expect(loaded).not.toBeNull();
    expect(loaded?.metadata).toEqual(sampleIndex.metadata);
    expect(loaded?.entries.length).toBe(2);
    expect(loaded?.entries[0].vector).toBeInstanceOf(Float32Array);
    expect(Array.from(loaded?.entries[0].vector ?? [])).toEqual([1, 0]);
  });

  it('rejects loading when embedding contains NaN, Infinity or non-numeric values', async () => {
    await mkdir(testDir, { recursive: true });
    const target = join(testDir, 'nan.semantic.json');
    const invalidJson = JSON.stringify({
      metadata: sampleIndex.metadata,
      entries: [{ ...sampleIndex.entries[0], vector: [null, 0] }],
    });
    await writeFile(target, invalidJson, 'utf8');
    expect(await store.load('nan')).toBeNull();
  });

  it('rejects loading when embedding dimension mismatches metadata', async () => {
    await mkdir(testDir, { recursive: true });
    const target = join(testDir, 'dim.semantic.json');
    const invalidJson = JSON.stringify({
      metadata: sampleIndex.metadata,
      entries: [{ ...sampleIndex.entries[0], vector: [1, 0, 0] }],
    });
    await writeFile(target, invalidJson, 'utf8');
    expect(await store.load('dim')).toBeNull();
  });

  it('preserves search ranking across persistence round-trip', async () => {
    await store.save(sampleIndex);
    const port = new FakeEmbeddingPort({ dimensions: 2 });
    const directSearch = new SemanticSearchUseCase(port, {
      load: async () => sampleIndex,
      save: async () => {},
      remove: async () => {},
    });
    const loadedSearch = new SemanticSearchUseCase(port, store);
    const query = { workspaceId: 'test-workspace', projectId: 'p', query: 'a', minScore: 0 };
    const directHits = await directSearch.execute(query);
    const loadedHits = await loadedSearch.execute(query);
    expect(loadedHits).toEqual(directHits);
  });

  it('removes index file cleanly', async () => {
    await store.save(sampleIndex);
    await store.remove('test-workspace');
    expect(await store.load('test-workspace')).toBeNull();
  });
});

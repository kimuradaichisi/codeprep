import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpEmbeddingAdapter } from '../HttpEmbeddingAdapter';

describe('HttpEmbeddingAdapter', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('embeds texts using batch embeddings response', async () => {
    const mockResponse = {
      embeddings: [
        [0.1, 0.2],
        [0.3, 0.4],
      ],
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const adapter = new HttpEmbeddingAdapter({ dimensions: 2 });
    const vectors = await adapter.embed(['hello', 'world']);

    expect(vectors.length).toBe(2);
    expect(vectors[0]).toBeInstanceOf(Float32Array);
    expect(Array.from(vectors[0])).toEqual([expect.closeTo(0.1), expect.closeTo(0.2)]);
  });

  it('handles single embedding response', async () => {
    const mockResponse = { embedding: [0.5, 0.6] };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const adapter = new HttpEmbeddingAdapter({ dimensions: 2 });
    const vectors = await adapter.embed(['single']);

    expect(vectors.length).toBe(1);
    expect(Array.from(vectors[0])).toEqual([expect.closeTo(0.5), expect.closeTo(0.6)]);
  });

  it('returns empty array immediately when given empty texts', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    const adapter = new HttpEmbeddingAdapter();
    const result = await adapter.embed([]);

    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws when HTTP response is not ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Error',
    });

    const adapter = new HttpEmbeddingAdapter();
    await expect(adapter.embed(['fail'])).rejects.toThrow('HTTP 500');
  });

  it('throws when API returns error field', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: 'model not found' }),
    });

    const adapter = new HttpEmbeddingAdapter();
    await expect(adapter.embed(['fail'])).rejects.toThrow('Embedding API error: model not found');
  });

  it('throws on dimension mismatch', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embeddings: [[1, 2, 3]] }),
    });

    const adapter = new HttpEmbeddingAdapter({ dimensions: 2 });
    await expect(adapter.embed(['fail'])).rejects.toThrow('dimension mismatch');
  });
});

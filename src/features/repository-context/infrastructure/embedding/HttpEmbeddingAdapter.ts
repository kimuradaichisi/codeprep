import type { EmbeddingPort } from '../../application/semanticIndexPorts';
import type { EmbeddingVector } from '../../domain/EmbeddingVector';

export interface HttpEmbeddingConfig {
  readonly providerId?: string;
  readonly endpoint?: string;
  readonly modelId?: string;
  readonly dimensions?: number;
  readonly timeoutMs?: number;
}

const DEFAULT_PROVIDER = 'ollama';
const DEFAULT_ENDPOINT = 'http://localhost:11434';
const DEFAULT_MODEL = 'nomic-embed-text';
const DEFAULT_DIMENSIONS = 768;
const DEFAULT_TIMEOUT_MS = 10000;

function toVector(raw: unknown, dim: number): EmbeddingVector {
  if (!Array.isArray(raw) || raw.length !== dim) {
    throw new Error(`Embedding vector dimension mismatch: expected ${dim}`);
  }
  const vec = new Float32Array(dim);
  for (let i = 0; i < dim; i++) {
    const val = raw[i];
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      throw new Error(`Invalid non-finite embedding element at index ${i}`);
    }
    vec[i] = val;
  }
  return vec;
}

function parseEmbedResponse(data: unknown, dim: number): EmbeddingVector[] {
  if (!data || typeof data !== 'object') throw new Error('Invalid embedding response');
  const obj = data as Record<string, unknown>;
  if (typeof obj.error === 'string') throw new Error(`Embedding API error: ${obj.error}`);
  if (Array.isArray(obj.embeddings)) {
    return obj.embeddings.map((item) => toVector(item, dim));
  }
  if (Array.isArray(obj.embedding)) {
    return [toVector(obj.embedding, dim)];
  }
  throw new Error('Embedding response missing embeddings/embedding field');
}

async function fetchWithTimeout(url: string, body: unknown, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export class HttpEmbeddingAdapter implements EmbeddingPort {
  public readonly providerId: string;
  public readonly modelId: string;
  public readonly dimensions: number;
  private readonly endpoint: string;
  private readonly timeoutMs: number;

  public constructor(config?: HttpEmbeddingConfig) {
    this.providerId = config?.providerId ?? DEFAULT_PROVIDER;
    this.endpoint = (config?.endpoint ?? DEFAULT_ENDPOINT).replace(/\/$/, '');
    this.modelId = config?.modelId ?? DEFAULT_MODEL;
    this.dimensions = config?.dimensions ?? DEFAULT_DIMENSIONS;
    this.timeoutMs = config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  public async embed(texts: readonly string[]): Promise<readonly EmbeddingVector[]> {
    if (texts.length === 0) return [];
    const url = `${this.endpoint}/api/embed`;
    const body = { model: this.modelId, input: texts };
    const json = await fetchWithTimeout(url, body, this.timeoutMs);
    return parseEmbedResponse(json, this.dimensions);
  }
}

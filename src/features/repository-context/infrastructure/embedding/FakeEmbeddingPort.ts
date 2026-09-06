import type { EmbeddingPort } from '../../application/semanticIndexPorts';
import type { EmbeddingVector } from '../../domain/EmbeddingVector';

const SYNONYMS: Readonly<Record<string, string>> = {
  返金: 'refund',
  返品: 'return',
  二重: 'duplicate',
  注文: 'order',
  決済: 'payment',
  認証: 'auth',
  トークン: 'token',
  アバター: 'avatar',
  署名: 'signature',
  タイムアウト: 'timeout',
  作成: 'create',
};

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function normalizeVector(vec: number[]): EmbeddingVector {
  let sumSq = 0;
  for (const v of vec) sumSq += v * v;
  const norm = Math.sqrt(sumSq);
  const out = new Float32Array(vec.length);
  if (norm === 0) {
    out[0] = 1;
    return out;
  }
  for (let i = 0; i < vec.length; i++) out[i] = vec[i] / norm;
  return out;
}

function extractTokens(text: string): string[] {
  const lower = text.toLowerCase();
  const rawWords = lower.match(/[\p{L}\p{N}_]+/gu) ?? [];
  const tokens: string[] = [];
  for (const w of rawWords) {
    tokens.push(w);
    for (const [jp, en] of Object.entries(SYNONYMS)) {
      if (w.includes(jp)) tokens.push(en);
    }
    if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/u.test(w)) {
      for (let i = 0; i < w.length - 1; i++) tokens.push(w.slice(i, i + 2));
    }
  }
  return tokens;
}

export class FakeEmbeddingPort implements EmbeddingPort {
  public readonly providerId = 'fake-provider';
  public readonly modelId: string;
  public readonly dimensions: number;
  public embedCalls = 0;

  public constructor(options?: { modelId?: string; dimensions?: number }) {
    this.modelId = options?.modelId ?? 'fake-embedding-v1';
    this.dimensions = options?.dimensions ?? 16;
  }

  public async embed(texts: readonly string[]): Promise<readonly EmbeddingVector[]> {
    this.embedCalls += 1;
    return texts.map((text) => this.embedSingle(text));
  }

  private embedSingle(text: string): EmbeddingVector {
    const tokens = extractTokens(text);
    const vector = new Array(this.dimensions).fill(0);
    for (const token of tokens) {
      const idx = hashString(token) % this.dimensions;
      vector[idx] += 1;
    }
    return normalizeVector(vector);
  }
}

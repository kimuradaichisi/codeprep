import type { EmbeddingVector } from './EmbeddingVector';

export function cosineSimilarity(query: EmbeddingVector, candidate: EmbeddingVector): number {
  if (query.length !== candidate.length) {
    throw new Error(
      `Dimension mismatch in cosineSimilarity: query(${query.length}) !== candidate(${candidate.length})`
    );
  }
  return computeCosine(query, candidate);
}

function accumulateDotAndNorms(a: EmbeddingVector, b: EmbeddingVector): [number, number, number] {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i];
    const bi = b[i];
    if (!Number.isFinite(ai) || !Number.isFinite(bi)) {
      throw new Error('Non-finite number encountered in cosineSimilarity computation');
    }
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  return [dot, normA, normB];
}

function computeCosine(a: EmbeddingVector, b: EmbeddingVector): number {
  const [dot, normA, normB] = accumulateDotAndNorms(a, b);
  if (normA <= 0 || normB <= 0) return 0;
  const similarity = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(-1, Math.min(1, similarity));
}

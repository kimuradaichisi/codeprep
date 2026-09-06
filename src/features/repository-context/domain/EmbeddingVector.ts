export type EmbeddingVector = Float32Array;

export function validateEmbeddingVector(
  vector: Float32Array | readonly number[],
  expectedDimensions?: number
): boolean {
  if (vector.length === 0) return false;
  if (expectedDimensions !== undefined && vector.length !== expectedDimensions) return false;
  for (let i = 0; i < vector.length; i++) {
    const v = vector[i];
    if (typeof v !== 'number' || !Number.isFinite(v)) return false;
  }
  return true;
}

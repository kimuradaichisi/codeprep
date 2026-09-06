import type { EmbeddingPort } from './semanticIndexPorts';
import type { EmbeddingVector } from '../domain/EmbeddingVector';

/**
 * テキスト配列を指定サイズのバッチに分割して埋め込みを計算する
 */
export async function batchEmbed(
  port: EmbeddingPort,
  texts: readonly string[],
  batchSize = 32
): Promise<readonly EmbeddingVector[]> {
  const vectors: EmbeddingVector[] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const chunk = texts.slice(i, i + batchSize);
    const result = await port.embed(chunk);
    for (let j = 0; j < result.length; j++) {
      vectors.push(result[j]);
    }
  }
  return vectors;
}

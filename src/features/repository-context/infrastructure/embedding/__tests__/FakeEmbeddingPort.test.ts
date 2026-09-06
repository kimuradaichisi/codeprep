import { describe, expect, it } from 'vitest';
import { cosineSimilarity } from '../../../domain/cosineSimilarity';
import { FakeEmbeddingPort } from '../FakeEmbeddingPort';

describe('FakeEmbeddingPort', () => {
  it('generates normalized vectors with configured dimensions', async () => {
    const port = new FakeEmbeddingPort({ dimensions: 8 });
    const [vec] = await port.embed(['Hello world']);
    expect(vec).toHaveLength(8);

    let normSq = 0;
    for (const v of vec) normSq += v * v;
    expect(Math.sqrt(normSq)).toBeCloseTo(1.0, 5);
  });

  it('is deterministic: same text produces identical vector', async () => {
    const port = new FakeEmbeddingPort({ dimensions: 16 });
    const [v1] = await port.embed(['Refund policy']);
    const [v2] = await port.embed(['Refund policy']);
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(1.0, 5);
  });

  it('measures positive similarity for texts with overlapping keywords', async () => {
    const port = new FakeEmbeddingPort({ dimensions: 16 });
    const [vRefund] = await port.embed(['Order refund duplicate prevention']);
    const [vTask] = await port.embed(['返品時の二重返金を調査する duplicate refund']);
    const [vUnrelated] = await port.embed(['Database connection pooling postgresql network']);

    const simRelated = cosineSimilarity(vRefund, vTask);
    const simUnrelated = cosineSimilarity(vRefund, vUnrelated);
    expect(simRelated).toBeGreaterThan(simUnrelated);
  });
});

import { describe, expect, it } from 'vitest';
import { validateEmbeddingVector } from '../EmbeddingVector';
import { cosineSimilarity } from '../cosineSimilarity';
import {
  CURRENT_SEMANTIC_SCHEMA_VERSION,
  sortSemanticEntries,
} from '../SemanticIndex';
import type { SemanticIndexEntry } from '../SemanticIndexEntry';

describe('SemanticIndex Domain', () => {
  describe('validateEmbeddingVector', () => {
    it('validates valid finite numbers with correct dimensions', () => {
      expect(validateEmbeddingVector([0.1, 0.2, -0.5], 3)).toBe(true);
      expect(validateEmbeddingVector([0, 1])).toBe(true);
    });

    it('rejects empty arrays, dimension mismatches, NaN, and Infinity', () => {
      expect(validateEmbeddingVector([])).toBe(false);
      expect(validateEmbeddingVector([0.1, 0.2], 3)).toBe(false);
      expect(validateEmbeddingVector([0.1, NaN, 0.3])).toBe(false);
      expect(validateEmbeddingVector([0.1, Infinity, 0.3])).toBe(false);
      expect(validateEmbeddingVector([0.1, -Infinity, 0.3])).toBe(false);
    });
  });

  const f32 = (arr: number[]) => new Float32Array(arr);

  describe('cosineSimilarity', () => {
    it('computes 1 for identical normalized vectors', () => {
      const v = f32([0.6, 0.8]);
      expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
    });

    it('computes 0 for orthogonal vectors', () => {
      const a = f32([1, 0]);
      const b = f32([0, 1]);
      expect(cosineSimilarity(a, b)).toBeCloseTo(0.0, 5);
    });

    it('computes -1 for opposite vectors', () => {
      const a = f32([1, 0]);
      const b = f32([-1, 0]);
      expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 5);
    });

    it('returns 0 when either vector is a zero vector', () => {
      const zero = f32([0, 0, 0]);
      const a = f32([1, 2, 3]);
      expect(cosineSimilarity(zero, a)).toBe(0);
      expect(cosineSimilarity(a, zero)).toBe(0);
    });

    it('throws error when vector dimensions mismatch', () => {
      expect(() => cosineSimilarity(f32([1, 2]), f32([1, 2, 3]))).toThrow('Dimension mismatch');
    });
  });

  describe('sortSemanticEntries', () => {
    it('sorts entries deterministically by projectId, relativePath, knowledgeEntryId', () => {
      const entries: SemanticIndexEntry[] = [
        {
          projectId: 'p2',
          relativePath: 'b.ts',
          knowledgeEntryId: 'k2',
          knowledgeKind: 'code-symbol',
          vector: f32([1]),
        },
        {
          projectId: 'p1',
          relativePath: 'z.md',
          knowledgeEntryId: 'k3',
          knowledgeKind: 'markdown-section',
          vector: f32([1]),
        },
        {
          projectId: 'p1',
          relativePath: 'a.ts',
          knowledgeEntryId: 'k1',
          knowledgeKind: 'code-symbol',
          vector: f32([1]),
        },
      ];

      const sorted = sortSemanticEntries(entries);
      expect(sorted.map((e) => e.knowledgeEntryId)).toEqual(['k1', 'k3', 'k2']);
      expect(CURRENT_SEMANTIC_SCHEMA_VERSION).toBe(1);
    });
  });
});

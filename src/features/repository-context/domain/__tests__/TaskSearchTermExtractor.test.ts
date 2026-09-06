// src/features/repository-context/domain/__tests__/TaskSearchTermExtractor.test.ts
import { describe, expect, it } from 'vitest';
import { extractTaskSearchTerms } from '../TaskSearchTermExtractor';

describe('TaskSearchTermExtractor', () => {
  it('handles empty or whitespace-only input', () => {
    expect(extractTaskSearchTerms('')).toEqual([]);
    expect(extractTaskSearchTerms('   \n\t ')).toEqual([]);
  });

  it('extracts quoted terms properly', () => {
    const terms = extractTaskSearchTerms('Find "double refund" in 「返金処理」 service');
    expect(terms).toContain('double refund');
    expect(terms).toContain('返金処理');
  });

  it('preserves CamelCase, PascalCase and path-like tokens', () => {
    const terms = extractTaskSearchTerms('Update OrderService.ts in src/order/OrderService.ts');
    expect(terms).toContain('OrderService.ts');
    expect(terms).toContain('src/order/OrderService.ts');
    expect(terms).toContain('OrderService');
  });

  it('extracts CJK keywords while ignoring single short particles', () => {
    const terms = extractTaskSearchTerms('返品時の二重返金の原因を調査する');
    expect(terms).toContain('返品時');
    expect(terms).toContain('二重返金');
    expect(terms).toContain('原因');
    expect(terms).toContain('調査');
  });

  it('deduplicates case-insensitively while producing deterministic output', () => {
    const terms1 = extractTaskSearchTerms('OrderService and orderservice');
    const terms2 = extractTaskSearchTerms('OrderService and orderservice');
    expect(terms1.length).toBe(1);
    expect(terms1).toEqual(terms2);
  });
});

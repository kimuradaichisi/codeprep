import { describe, it, expect } from 'vitest';
import { budgetSummary, candidateKey, estimateTokens, formatTokens, selectedTokenTotal } from './tokenBudget';
import type { AnalyzedCandidate } from '../../../../src/features/desktop-core/application/ports';

const candidate = (projectId: string, relativePath: string, size: number | undefined): AnalyzedCandidate => ({
    projectId, relativePath, reasons: ['pathAffinity'], excluded: false, score: 0, size,
});

describe('tokenBudget', () => {
    it('estimates 1 token per 4 bytes rounding up', () => {
        expect(estimateTokens(0)).toBe(0);
        expect(estimateTokens(1)).toBe(1);
        expect(estimateTokens(400)).toBe(100);
        expect(estimateTokens(401)).toBe(101);
    });
    it('treats invalid byte counts as zero tokens', () => {
        expect(estimateTokens(-1)).toBe(0);
        expect(estimateTokens(Number.NaN)).toBe(0);
        expect(estimateTokens(Number.POSITIVE_INFINITY)).toBe(0);
    });
    it('formats thousands with a k suffix', () => {
        expect(formatTokens(999)).toBe('999');
        expect(formatTokens(1000)).toBe('1.0k');
        expect(formatTokens(1500)).toBe('1.5k');
    });
    it('sums tokens for selected candidates only', () => {
        const candidates = [
            candidate('p1', 'a.ts', 400),
            candidate('p1', 'b.ts', 800),
            candidate('p1', 'c.ts', undefined),
        ];
        expect(selectedTokenTotal(candidates, ['p1:a.ts'])).toBe(100);
        expect(selectedTokenTotal(candidates, ['p1:c.ts'])).toBe(0);
    });
    it('matches Windows candidate paths with POSIX selected keys', () => {
        const candidates = [candidate('p1', 'src\\auth.ts', 400)];

        expect(candidateKey('p1', 'src\\auth.ts')).toBe('p1:src/auth.ts');
        expect(selectedTokenTotal(candidates, ['p1:src/auth.ts'])).toBe(100);
    });
    it('flags over budget when selected tokens exceed the limit', () => {
        expect(budgetSummary(120, 100)).toMatchObject({ over: true, ratio: 1 });
        expect(budgetSummary(50, 100)).toMatchObject({ over: false, ratio: 0.5 });
        expect(budgetSummary(100, 100)).toMatchObject({ over: false, ratio: 1 });
        expect(budgetSummary(120, 0)).toMatchObject({ over: true, ratio: 1 });
        expect(budgetSummary(0, 0)).toMatchObject({ over: false, ratio: 0 });
        expect(budgetSummary(50, -1)).toMatchObject({ over: true, ratio: 1 });
        expect(budgetSummary(50, Number.NaN)).toMatchObject({ over: true, ratio: 1 });
        expect(budgetSummary(50, Number.POSITIVE_INFINITY)).toMatchObject({ over: true, ratio: 1 });
        expect(budgetSummary(0, Number.NaN)).toMatchObject({ over: false, ratio: 0 });
        expect(budgetSummary(50, 100).label).toBe('~50 / 100 tokens');
    });
    it('treats non-positive and non-finite selected tokens as zero', () => {
        for (const selectedTokens of [Number.NaN, -1, Number.POSITIVE_INFINITY]) {
            expect(budgetSummary(selectedTokens, 100)).toEqual({
                label: '~0 / 100 tokens', over: false, ratio: 0,
            });
        }
    });
});
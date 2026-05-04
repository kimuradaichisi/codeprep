import { describe, it, expect } from 'vitest';
import { ok, fail } from '../Result';

describe('Result Pattern', () => {
    it('ok: should create a Success object', () => {
        const result = ok('val');
        expect(result.isSuccess).toBe(true);
        expect(result.isFailure).toBe(false);
        if (result.isSuccess) {
            expect(result.value).toBe('val');
        }
    });

    it('fail: should create a Failure object', () => {
        const error = new Error('err');
        const result = fail(error);
        expect(result.isSuccess).toBe(false);
        expect(result.isFailure).toBe(true);
        if (result.isFailure) {
            expect(result.error).toBe(error);
        }
    });

    it('should work with custom error types', () => {
        const result = fail<string, string>('custom error');
        expect(result.isFailure).toBe(true);
        if (result.isFailure) {
            expect(result.error).toBe('custom error');
        }
    });
});

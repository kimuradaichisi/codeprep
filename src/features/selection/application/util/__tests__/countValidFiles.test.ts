import { describe, it, expect } from 'vitest';
import { countValidFiles } from '../countValidFiles';

describe('countValidFiles', () => {
    it('counts only files with non-empty content', () => {
        const files = [
            { path: 'a.ts', content: 'x' },
            { path: 'b.ts', content: '' },
            { path: 'c.ts', content: null },
        ];
        expect(countValidFiles(files as any)).toBe(1);
    });
});

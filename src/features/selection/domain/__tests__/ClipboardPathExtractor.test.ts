import { describe, it, expect } from 'vitest';
import { ClipboardPathExtractor } from '../ClipboardPathExtractor';

describe('ClipboardPathExtractor', () => {
    const extractor = new ClipboardPathExtractor();

    it('should extract valid paths from messy text', () => {
        const text = `
            Check this file: src/app.ts
            Also this one: ./components/Header.tsx:10:5
            Ignore this: 123.456 and this: random.text
        `;
        const result = extractor.extract(text);

        expect(result).toContain('src/app.ts');
        expect(result).toContain('./components/Header.tsx');
        expect(result).not.toContain('123.456');
    });

    it('should return unique paths only', () => {
        const text = 'src/app.ts and src/app.ts';
        const result = extractor.extract(text);
        expect(result).toHaveLength(1);
    });
});
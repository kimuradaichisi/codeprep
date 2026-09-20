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

    it('should extract WSL UNC and posix paths', () => {
        const text = 'Files: \\\\wsl$\\Ubuntu\\home\\user\\src\\app.ts and /home/user/src/index.ts';
        const result = extractor.extract(text);
        expect(result).toContain('//wsl$/Ubuntu/home/user/src/app.ts');
        expect(result).toContain('/home/user/src/index.ts');
    });
});
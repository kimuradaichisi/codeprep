import { describe, it, expect } from 'vitest';
import { PatchCandidateParser } from '../PatchCandidateParser';

describe('PatchCandidateParser', () => {
    it('parses path+codeblock', () => {
        const p = new PatchCandidateParser();
        const text = 'src/foo.ts\n```ts\nexport const x = 1\n```';
        const res = p.parse(text, 'pathCodeBlock');
        expect(res.length).toBe(1);
        expect(res[0].pathHint).toBe('src/foo.ts');
    });
});

import { PatchFormatDetector } from '../PatchFormatDetector';

describe('PatchFormatDetector', () => {
    it('detects unified diff', () => {
        const d = new PatchFormatDetector();
        const text = '--- a/file\n+++ b/file\n@@ -1 +1 @@\n- old\n+ new';
        expect(d.detect(text)).toBe('unifiedDiff');
    });

    it('detects pathCodeBlock', () => {
        const d = new PatchFormatDetector();
        const text = 'src/foo.ts\n```ts\nexport const a = 1\n```';
        expect(d.detect(text)).toBe('pathCodeBlock');
    });
});

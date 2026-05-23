import { describe, it, expect } from 'vitest';
import { SmartPatchUseCase } from '../SmartPatchUseCase';

class MemFS {
    constructor(private map: Record<string, string>) { }
    async readFile(path: string) { return this.map[path] ?? ''; }
}

describe('SmartPatchUseCase', () => {
    it('produces plan for pathCodeBlock', async () => {
        const text = 'src/foo.ts\n```ts\nexport const x = 2\n```';
        const fs = new MemFS({ 'src/foo.ts': 'export const x = 1\n' });
        const u = new SmartPatchUseCase(fs as any, ['src/foo.ts']);
        const plans = await u.planFromText(text);
        expect(plans.length).toBe(1);
        expect(plans[0].targetPath).toBe('src/foo.ts');
        expect(plans[0].diff).toContain('- export const x = 1');
    });
});

import { describe, it, expect, vi } from 'vitest';
import { GitCliClient } from '../GitCliClient';

vi.mock('vscode', () => ({
    workspace: { findFiles: vi.fn().mockResolvedValue([]), asRelativePath: vi.fn(uri => uri.fsPath) },
    Uri: { file: vi.fn(path => ({ fsPath: path })) }
}));

describe('GitCliClient.getRecentFiles', () => {
    it('orders files by frequency in git log output', async () => {
        const mockExec = vi.fn()
            .mockResolvedValueOnce({ stdout: 'src/a.ts\nsrc/b.ts\nsrc/a.ts\nsrc/c.ts\nsrc/a.ts\n' });

        const client = new GitCliClient(mockExec as any);
        const res = await client.getRecentFiles('/repo', 10);
        expect(res.isSuccess).toBe(true);
        if (res.isSuccess) {
            expect(res.value[0]).toBe('src/a.ts');
            expect(res.value).toContain('src/b.ts');
            expect(res.value).toContain('src/c.ts');
        }
    });
});

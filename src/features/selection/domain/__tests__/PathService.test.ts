import { describe, it, expect } from 'vitest';
import { PathService } from '../PathService';

describe('PathService', () => {
    it('should derive all parent directory paths for a list of files', () => {
        const input = ['src/app.ts', 'src/components/Button.tsx', 'README.md'];
        const result = PathService.deriveAllPaths(input);

        // 親ディレクトリがすべて含まれているか
        expect(result).toContain('src');
        expect(result).toContain('src/components');
        
        // 元のファイルが含まれているか
        expect(result).toContain('src/app.ts');
        expect(result).toContain('src/components/Button.tsx');
        expect(result).toContain('README.md');
        
        // 重複がないか
        const unique = new Set(result);
        expect(unique.size).toBe(result.length);
    });

    it('should handle root level files correctly', () => {
        const input = ['package.json'];
        const result = PathService.deriveAllPaths(input);
        expect(result).toEqual(['package.json']);
    });

    it('should handle deeply nested paths', () => {
        const input = ['a/b/c/d.txt'];
        const result = PathService.deriveAllPaths(input);
        expect(result).toContain('a');
        expect(result).toContain('a/b');
        expect(result).toContain('a/b/c');
        expect(result).toContain('a/b/c/d.txt');
    });

    it('should return an empty array for empty input', () => {
        expect(PathService.deriveAllPaths([])).toEqual([]);
});

    it('should not duplicate folders for multiple files in the same directory', () => {
        const input = ['src/a.ts', 'src/b.ts'];
        const result = PathService.deriveAllPaths(input);
        const srcCount = result.filter(p => p === 'src').length;
        expect(srcCount).toBe(1);
    });
});
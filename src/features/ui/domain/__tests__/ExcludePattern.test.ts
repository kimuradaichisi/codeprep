import { describe, it, expect } from 'vitest';
import { ExcludePattern } from '../ExcludePattern';

describe('ExcludePattern', () => {
    describe('Standard patterns', () => {
        it('should match exact directory name', () => {
            const pattern = ExcludePattern.create('node_modules');
            expect(pattern.match('node_modules')).toBe(true);
            expect(pattern.match('node_modules/abc')).toBe(true);
            expect(pattern.match('src/node_modules')).toBe(true);
            expect(pattern.match('not_node_modules')).toBe(false);
        });

        it('should match wildcard patterns', () => {
            const pattern = ExcludePattern.create('*.tmp');
            expect(pattern.match('test.tmp')).toBe(true);
            expect(pattern.match('dir/test.tmp')).toBe(true);
            expect(pattern.match('tmp.test')).toBe(false);
        });
    });

    describe('Regex patterns', () => {
        it('should match custom regex', () => {
            const pattern = ExcludePattern.createFromRegex('\\.test\\.(ts|js)$');
            expect(pattern.match('app.test.ts')).toBe(true);
            expect(pattern.match('app.test.js')).toBe(true);
            expect(pattern.match('app.ts')).toBe(false);
        });
    });

    describe('Path boundaries', () => {
        it('should handle nested paths correctly', () => {
            const pattern = ExcludePattern.create('dist');
            expect(pattern.match('dist/main.js')).toBe(true);
            expect(pattern.match('src/dist/main.js')).toBe(true);
            expect(pattern.match('distribute')).toBe(false);
        });
    });
});

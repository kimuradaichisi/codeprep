import { describe, it, expect } from 'vitest';
import { PathValidator } from '../PathValidator';

describe('PathValidator', () => {
    it('should exclude common development directories', () => {
        expect(PathValidator.isValidPath('node_modules/index.js')).toBe(false);
        expect(PathValidator.isValidPath('.git/config')).toBe(false);
        expect(PathValidator.isValidPath('dist/bundle.js')).toBe(false);
    });

    it('should allow special configuration files', () => {
        expect(PathValidator.isValidPath('package.json')).toBe(true);
        expect(PathValidator.isValidPath('tsconfig.json')).toBe(true);
        expect(PathValidator.isValidPath('.gitignore')).toBe(true);
        expect(PathValidator.isValidPath('vitest.config.ts')).toBe(true);
    });

    it('should exclude binary and log extensions', () => {
        expect(PathValidator.isValidPath('app.exe')).toBe(false);
        expect(PathValidator.isValidPath('debug.log')).toBe(false);
        expect(PathValidator.isValidPath('image.so')).toBe(false);
    });

    it('should validate file paths correctly in strict mode', () => {
        expect(PathValidator.isValidFilePath('src/main.ts')).toBe(true);
        expect(PathValidator.isValidFilePath('LICENSE')).toBe(true);
        expect(PathValidator.isValidFilePath('noextension')).toBe(false);
    });
});
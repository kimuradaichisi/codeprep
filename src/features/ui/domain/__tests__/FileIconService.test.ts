import { describe, it, expect } from 'vitest';
import { FileIconService } from '../FileIconService';
import { FileIconType } from '../FileIconType';

describe('FileIconService', () => {
    const service = new FileIconService();

    it('should return folder icon for directories', () => {
        expect(service.getIconType(true, false)).toBe(FileIconType.Folder);
        expect(service.getIconType(true, true)).toBe(FileIconType.Folder);
    });

    it('should return file icon for unmodified files', () => {
        expect(service.getIconType(false, false)).toBe(FileIconType.File);
    });

    it('should return modified file icon for git-modified files', () => {
        expect(service.getIconType(false, true)).toBe(FileIconType.ModifiedFile);
    });
});

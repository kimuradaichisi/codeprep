import { describe, expect, it, vi } from 'vitest';
import { buildDefaultFileName, buildSaveDialogOptions, saveOutputFile, type OutputFileDependencies } from './OutputFileSaver';

describe('OutputFileSaver', () => {
  const fixedDate = new Date('2026-08-05T13:57:00');

  describe('buildDefaultFileName & buildSaveDialogOptions', () => {
    it('suggests .md for markdown format with formatted timestamp', () => {
      const fileName = buildDefaultFileName('markdown', fixedDate);
      expect(fileName).toBe('codeprep-context-20260805-135700.md');

      const options = buildSaveDialogOptions('markdown', fixedDate);
      expect(options).toEqual({
        title: 'Save generated context',
        defaultPath: 'codeprep-context-20260805-135700.md',
        filters: [{ name: 'Markdown Files', extensions: ['md'] }],
      });
    });

    it('suggests .xml for xml format', () => {
      const fileName = buildDefaultFileName('xml', fixedDate);
      expect(fileName).toBe('codeprep-context-20260805-135700.xml');

      const options = buildSaveDialogOptions('xml', fixedDate);
      expect(options.filters).toEqual([{ name: 'XML Files', extensions: ['xml'] }]);
    });

    it('suggests .json for json format', () => {
      const fileName = buildDefaultFileName('json', fixedDate);
      expect(fileName).toBe('codeprep-context-20260805-135700.json');

      const options = buildSaveDialogOptions('json', fixedDate);
      expect(options.filters).toEqual([{ name: 'JSON Files', extensions: ['json'] }]);
    });
  });

  describe('saveOutputFile', () => {
    it('returns cancelled status and does not write when dialog is canceled', async () => {
      const showSaveDialog = vi.fn().mockResolvedValue({ canceled: true });
      const writeFile = vi.fn().mockResolvedValue(undefined);
      const deps: OutputFileDependencies = { showSaveDialog, writeFile, now: () => fixedDate };

      const result = await saveOutputFile(deps, { content: 'hello', format: 'markdown' });

      expect(result).toEqual({ status: 'cancelled' });
      expect(writeFile).not.toHaveBeenCalled();
    });

    it('handles abnormal dialog result with canceled=false but no filePath', async () => {
      const showSaveDialog = vi.fn().mockResolvedValue({ canceled: false, filePath: undefined });
      const writeFile = vi.fn().mockResolvedValue(undefined);
      const deps: OutputFileDependencies = { showSaveDialog, writeFile, now: () => fixedDate };

      const result = await saveOutputFile(deps, { content: 'hello', format: 'markdown' });

      expect(result).toEqual({ status: 'cancelled' });
      expect(writeFile).not.toHaveBeenCalled();
    });

    it('writes content and returns saved status on success', async () => {
      const targetPath = '/path/to/codeprep-context-20260805-135700.md';
      const showSaveDialog = vi.fn().mockResolvedValue({ canceled: false, filePath: targetPath });
      const writeFile = vi.fn().mockResolvedValue(undefined);
      const deps: OutputFileDependencies = { showSaveDialog, writeFile, now: () => fixedDate };

      const result = await saveOutputFile(deps, { content: '# Hello World', format: 'markdown' });

      expect(result).toEqual({ status: 'saved', filePath: targetPath });
      expect(writeFile).toHaveBeenCalledWith(targetPath, '# Hello World');
    });

    it('propagates dialog exceptions', async () => {
      const showSaveDialog = vi.fn().mockRejectedValue(new Error('Dialog failed'));
      const writeFile = vi.fn().mockResolvedValue(undefined);
      const deps: OutputFileDependencies = { showSaveDialog, writeFile, now: () => fixedDate };

      await expect(saveOutputFile(deps, { content: 'hello', format: 'markdown' })).rejects.toThrow('Dialog failed');
    });

    it('propagates write exceptions', async () => {
      const targetPath = '/path/to/file.md';
      const showSaveDialog = vi.fn().mockResolvedValue({ canceled: false, filePath: targetPath });
      const writeFile = vi.fn().mockRejectedValue(new Error('Disk full'));
      const deps: OutputFileDependencies = { showSaveDialog, writeFile, now: () => fixedDate };

      await expect(saveOutputFile(deps, { content: 'hello', format: 'markdown' })).rejects.toThrow('Disk full');
    });
  });
});

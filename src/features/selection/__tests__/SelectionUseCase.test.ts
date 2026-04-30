import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SelectionUseCase } from '../application/SelectionUseCase';
import { Selection } from '../domain/Selection';
import { ISelectionRepository } from '../domain/ISelectionRepository';
import { IFileValidator } from '../domain/IFileValidator';

describe('SelectionUseCase', () => {
  let useCase: SelectionUseCase;
  let selection: Selection;
  let repository: ISelectionRepository;
  let validator: IFileValidator;

  beforeEach(() => {
    selection = new Selection();
    repository = {
      savePaths: vi.fn(),
      loadPaths: vi.fn(),
      getPresetList: vi.fn(),
      addToPresetList: vi.fn(),
    };
    validator = {
      exists: vi.fn().mockResolvedValue(true),
      isExcluded: vi.fn().mockReturnValue(false),
    };
    useCase = new SelectionUseCase(selection, repository, validator);
  });

  it('プリセットを保存できること', async () => {
    selection.set('file1.ts', true);
    await useCase.savePreset('test-preset');

    expect(repository.savePaths).toHaveBeenCalledWith('test-preset', ['file1.ts']);
    expect(repository.addToPresetList).toHaveBeenCalledWith('test-preset');
  });

  it('プリセットをロードできること', async () => {
    vi.mocked(repository.loadPaths).mockResolvedValue(['valid.ts', 'invalid.ts', 'excluded.ts']);
    vi.mocked(validator.exists).mockImplementation(async (p) => p !== 'invalid.ts');
    vi.mocked(validator.isExcluded).mockImplementation((p) => p === 'excluded.ts');

    const result = await useCase.loadPreset('test-preset');

    expect(result).toBe(true);
    expect(selection.has('valid.ts')).toBe(true);
    expect(selection.has('invalid.ts')).toBe(false);
    expect(selection.has('excluded.ts')).toBe(false);
    expect(selection.count).toBe(1);
  });

  it('全選択ができること', async () => {
    const wsRepo = { getAllFiles: vi.fn().mockResolvedValue(['a.ts', 'b.ts']) };
    await useCase.selectAll(wsRepo);
    expect(selection.count).toBe(2);
    expect(selection.has('a.ts')).toBe(true);
  });

  it('選択を反転できること', async () => {
    selection.set('a.ts', true);
    const wsRepo = { getAllFiles: vi.fn().mockResolvedValue(['a.ts', 'b.ts']) };
    await useCase.invertSelection(wsRepo);
    expect(selection.has('a.ts')).toBe(false);
    expect(selection.has('b.ts')).toBe(true);
  });

  it('Gitで変更されたファイルを選択できること', async () => {
    const gitUtils = { getModifiedFiles: vi.fn().mockResolvedValue(['mod.ts']) };
    await useCase.selectModifiedFiles(gitUtils, '/root');
    expect(selection.has('mod.ts')).toBe(true);
    expect(selection.count).toBe(1);
  });
});

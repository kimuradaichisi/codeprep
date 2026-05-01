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

  it('階層構造を持つファイル群を全選択できること', async () => {
    const wsRepo = { getAllFiles: vi.fn().mockResolvedValue(['src/a.ts', 'docs/b.md']) };
    await useCase.selectAll(wsRepo);
    
    // 期待されるパス: 'src/a.ts', 'src', 'docs/b.md', 'docs'
    expect(selection.count).toBe(4);
    expect(selection.has('src/a.ts')).toBe(true);
    expect(selection.has('src')).toBe(true);
    expect(selection.has('docs/b.md')).toBe(true);
    expect(selection.has('docs')).toBe(true);
  });

  it('ディレクトリを含めて選択を反転できること', async () => {
    const wsRepo = { getAllFiles: vi.fn().mockResolvedValue(['src/a.ts', 'src/b.ts']) };
    // 最初は src/a.ts と src のみが選択されている状態
    selection.set('src/a.ts', true);
    selection.set('src', true);
    
    await useCase.invertSelection(wsRepo);
    
    // 全パスは ['src/a.ts', 'src/b.ts', 'src']
    // 反転後は 'src/b.ts' のみが選択されているはず
    expect(selection.has('src/a.ts')).toBe(false);
    expect(selection.has('src')).toBe(false);
    expect(selection.has('src/b.ts')).toBe(true);
    expect(selection.count).toBe(1);
  });

  it('Gitで変更されたファイルを選択できること', async () => {
    const gitUtils = {
      getModifiedFiles: vi.fn().mockResolvedValue(['mod.ts']),
      findRelatedTests: vi.fn().mockResolvedValue([]) // 必ず追加
    };
    await useCase.selectModifiedFiles(gitUtils, '/root');
    expect(selection.has('mod.ts')).toBe(true);
    expect(selection.count).toBe(1);
  });

  it('should update directory selection recursively including subdirectories', async () => {
    // 構造: dir/sub/a.ts
    const mockRepo = {
        getFilesUnder: vi.fn().mockResolvedValue(['dir/sub/a.ts'])
    };
    await useCase.updateDirectorySelection(mockRepo as any, 'dir', true);
    
    expect(mockRepo.getFilesUnder).toHaveBeenCalledWith('dir');
    // 'dir/sub/a.ts', 'dir/sub', 'dir' の3つが選択されるはず
    expect(selection.count).toBe(3);
    expect(selection.has('dir/sub/a.ts')).toBe(true);
    expect(selection.has('dir/sub')).toBe(true);
    expect(selection.has('dir')).toBe(true);
  });
});

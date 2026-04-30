import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VSCodeSelectionRepository } from '../infrastructure/VSCodeSelectionRepository';
import * as vscode from 'vscode';

vi.mock('vscode', () => ({
  Memento: vi.fn(),
}));

describe('VSCodeSelectionRepository', () => {
  let repository: VSCodeSelectionRepository;
  let mockMemento: any;

  beforeEach(() => {
    mockMemento = {
      get: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    };
    repository = new VSCodeSelectionRepository(mockMemento);
  });

  it('パスを保存できること', async () => {
    await repository.savePaths('preset1', ['file1.ts']);
    expect(mockMemento.update).toHaveBeenCalledWith('codeprep.preset.preset1', ['file1.ts']);
  });

  it('パスをロードできること', async () => {
    mockMemento.get.mockReturnValue(['file1.ts']);
    const paths = await repository.loadPaths('preset1');
    expect(paths).toEqual(['file1.ts']);
    expect(mockMemento.get).toHaveBeenCalledWith('codeprep.preset.preset1');
  });

  it('プリセットリストを取得できること', () => {
    mockMemento.get.mockReturnValue(['p1', 'p2']);
    const list = repository.getPresetList();
    expect(list).toEqual(['p1', 'p2']);
    expect(mockMemento.get).toHaveBeenCalledWith('codeprep.presets', []);
  });

  it('プリセットリストに新規追加できること', async () => {
    mockMemento.get.mockReturnValue(['p1']);
    await repository.addToPresetList('p2');
    expect(mockMemento.update).toHaveBeenCalledWith('codeprep.presets', ['p1', 'p2']);
  });

  it('既存のプリセットはリストに追加されないこと', async () => {
    mockMemento.get.mockReturnValue(['p1', 'p2']);
    await repository.addToPresetList('p1');
    expect(mockMemento.update).not.toHaveBeenCalled();
  });
});

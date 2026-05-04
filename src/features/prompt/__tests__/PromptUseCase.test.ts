import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromptUseCase } from '../application/PromptUseCase';
import { PromptCollection } from '../domain/PromptCollection';
import { IPromptRepository } from '../domain/IPromptRepository';

describe('PromptUseCase', () => {
  let useCase: PromptUseCase;
  let mockRepository: IPromptRepository;

  beforeEach(() => {
    mockRepository = {
      loadAll: vi.fn(),
      saveAll: vi.fn(),
      getPatchInjectionPrompt: vi.fn().mockReturnValue('\n\nPatchInstructions'),
      shouldAlwaysAddPatchInstructions: vi.fn().mockResolvedValue(false),
    };
    useCase = new PromptUseCase(mockRepository);
  });

  it('プロンプトの内容を取得できること', async () => {
    const collection = PromptCollection.fromRecord({ 'test': 'content' });
    vi.mocked(mockRepository.loadAll).mockResolvedValue(collection);

    const content = await useCase.getPromptContent('test');
    expect(content).toBe('content');
  });

  it('設定が有効な場合、パッチ指示が自動注入されること', async () => {
    const collection = PromptCollection.fromRecord({ 'test': 'content' });
    vi.mocked(mockRepository.loadAll).mockResolvedValue(collection);
    vi.mocked(mockRepository.shouldAlwaysAddPatchInstructions).mockResolvedValue(true);

    const content = await useCase.getPromptContent('test', { files: [] });
    expect(content).toBe('content\n\nPatchInstructions');
  });

  it('既にパッチ指示が含まれる場合は二重に注入しないこと', async () => {
    const collection = PromptCollection.fromRecord({ 'test': 'Patch Mode content' });
    vi.mocked(mockRepository.loadAll).mockResolvedValue(collection);
    vi.mocked(mockRepository.shouldAlwaysAddPatchInstructions).mockResolvedValue(true);

    const content = await useCase.getPromptContent('test', { files: [] });
    expect(content).toBe('Patch Mode content');
  });

  it('新しいプロンプトをインポートしてマージ保存すること', async () => {
    const existing = PromptCollection.fromRecord({ 'old': 'old' });
    vi.mocked(mockRepository.loadAll).mockResolvedValue(existing);

    await useCase.importPrompts({ 'new': 'new' });

    expect(mockRepository.saveAll).toHaveBeenCalledWith(expect.any(PromptCollection));
  });
});

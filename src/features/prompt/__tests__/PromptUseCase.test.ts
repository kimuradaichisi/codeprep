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
    };
    useCase = new PromptUseCase(mockRepository);
  });

  it('プロンプトの内容を取得できること', async () => {
    const collection = PromptCollection.fromRecord({ 'test': 'content' });
    vi.mocked(mockRepository.loadAll).mockResolvedValue(collection);

    const content = await useCase.getPromptContent('test');
    expect(content).toBe('content');
  });

  it('新しいプロンプトをインポートしてマージ保存すること', async () => {
    const existing = PromptCollection.fromRecord({ 'old': 'old' });
    vi.mocked(mockRepository.loadAll).mockResolvedValue(existing);

    await useCase.importPrompts({ 'new': 'new' });

    expect(mockRepository.saveAll).toHaveBeenCalledWith(expect.any(PromptCollection));
    const savedCollection = vi.mocked(mockRepository.saveAll).mock.calls[0][0];
    expect(savedCollection.findByName('old')).toBeDefined();
    expect(savedCollection.findByName('new')).toBeDefined();
  });
});

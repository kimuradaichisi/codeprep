import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokenCount } from '../domain/TokenCount';
import { TokenStatistics } from '../domain/TokenStatistics';
import { TokenUseCase } from '../application/TokenUseCase';
import { ITokenPresenter } from '../domain/ITokenPresenter';

describe('Token Domain & Application', () => {
  describe('TokenCount', () => {
    it('k表示への変換が正しいこと', () => {
      expect(new TokenCount(500).toString()).toBe('500');
      expect(new TokenCount(1000).toString()).toBe('1.0k');
      expect(new TokenCount(1550).toString()).toBe('1.6k');
    });

    it('制限チェックが正しいこと', () => {
      const count = new TokenCount(100);
      expect(count.isExceeding(50)).toBe(true);
      expect(count.isExceeding(150)).toBe(false);
    });
  });

  describe('TokenStatistics', () => {
    it('文字数からトークン数を正しく計算すること', () => {
      const stats = new TokenStatistics(1, 400);
      expect(stats.estimatedTokens.value).toBe(100);
    });

    it('ファイルリストから集計できること', () => {
      const files = [{ size: 100 }, { size: 200 }];
      const stats = TokenStatistics.fromFiles(files);
      expect(stats.fileCount).toBe(2);
      expect(stats.totalCharacters).toBe(300);
    });
  });

  describe('TokenUseCase', () => {
    let useCase: TokenUseCase;
    let mockPresenter: ITokenPresenter;

    beforeEach(() => {
      mockPresenter = {
        present: vi.fn(),
        clear: vi.fn(),
      };
      useCase = new TokenUseCase(mockPresenter);
    });

    it('ファイルがある場合は表示を更新すること', () => {
      useCase.update([{ path: 'a.ts', size: 400 }], 1000);
      expect(mockPresenter.present).toHaveBeenCalled();
      const stats = vi.mocked(mockPresenter.present).mock.calls[0][0];
      expect(stats.totalCharacters).toBe(400);
    });

    it('ファイルがない場合は表示をクリアすること', () => {
      useCase.update([], 1000);
      expect(mockPresenter.clear).toHaveBeenCalled();
    });
  });
});

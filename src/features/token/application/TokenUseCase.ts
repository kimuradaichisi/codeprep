import { ITokenPresenter } from '../domain/ITokenPresenter';
import { TokenStatistics } from '../domain/TokenStatistics';

/**
 * トークン集計ユースケース
 */
export class TokenUseCase {
  constructor(private presenter: ITokenPresenter) {}

  /**
   * 選択されたファイルに基づいて統計を更新し、表示する
   */
  public update(files: { path: string; size: number }[], tokenLimit: number): void {
    if (files.length === 0) {
      this.presenter.clear();
      return;
    }

    const stats = TokenStatistics.fromFiles(files);
    this.presenter.present(stats, tokenLimit);
  }
}

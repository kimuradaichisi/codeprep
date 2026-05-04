import { ITokenPresenter } from '../domain/ITokenPresenter';
import { TokenStatistics } from '../domain/TokenStatistics';

export class TokenUseCase {
  private batchFiles: { path: string; size: number }[] = [];

  constructor(private presenter: ITokenPresenter) {}

  public update(files: { path: string; size: number }[], tokenLimit: number): void {

    if (files.length === 0) {
      this.presenter.clear();
      return;
    }
    const stats = TokenStatistics.fromFiles(files);
    this.presenter.present(stats, tokenLimit);
  }

  public resetBatch(): void {
    this.batchFiles = [];
  }

  public addFileToBatch(path: string, size: number): void {
    this.batchFiles.push({ path, size });
  }


  public commitBatch(tokenLimit: number): void {
    this.update(this.batchFiles, tokenLimit);
  }
}


import { Result } from '../../../shared/domain/Result';

/**
 * クリップボード操作を抽象化するインターフェース
 */
export interface IClipboard {
  readText(): Promise<Result<string>>;
}

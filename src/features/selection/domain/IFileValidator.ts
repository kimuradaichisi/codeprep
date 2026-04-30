/**
 * ファイルの有効性を検証するインターフェース
 */
export interface IFileValidator {
  exists(filePath: string): Promise<boolean>;
  isExcluded(filePath: string): boolean;
}

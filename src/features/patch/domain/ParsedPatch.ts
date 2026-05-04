/**
 * 解析されたパッチ情報を保持するバリューオブジェクト
 */
export class ParsedPatch {
  constructor(
    public readonly filePath: string,
    public readonly code: string
  ) {}

  /**
   * 有効なパッチ情報か検証する
   */
  public isValid(): boolean {
    return this.filePath.length > 0 && this.code.length > 0;
  }
}

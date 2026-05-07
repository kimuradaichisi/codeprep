/* src/features/selection/domain/ClipboardPathExtractor.ts */
/*
 * Copyright 2026 CodePrep Contributors
 */
import { PathValidator } from '../../../shared/domain/PathValidator';

export class ClipboardPathExtractor {
  private readonly pathRegex = /([a-zA-Z0-9._\-/]+\.[a-zA-Z0-9]+)(?::\d+:\d+)?/g;

  /**
   * テキストからファイルパスを抽出し、一意な相対パスの配列として返す
   */
  public extract(text: string): string[] {
    const paths = new Set<string>();
    const matches = Array.from(text.matchAll(this.pathRegex));

    for (const match of matches) {
      const candidate = match[1];
      if (this.isValid(candidate)) {
        paths.add(candidate.replace(/\\/g, '/'));
      }
    }

    return Array.from(paths);
  }

  /**
   * 抽出されたパスがCodePrepの対象として妥当か判定する
   * (規約: 1メソッド15行以内)
   */
  private isValid(candidate: string): boolean {
    // PathValidator内部でDEFAULT_EXTSは処理されるため、追加分がなければ渡さなくて良い
    // もし追加したい場合は PathValidator.DEFAULT_EXTS を参照する
    return PathValidator.isValidPath(candidate, {
      minLength: 1,
      allowSpecialFiles: true
    });
  }
}
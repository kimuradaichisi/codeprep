/*
 * Copyright 2026 CodePrep Contributors
 */
import { PathValidator } from '../../../shared/domain/PathValidator';

export class ClipboardPathExtractor {
  /**
   * テキストからファイルパスを抽出し、一意な相対パスの配列として返す
   */
  public extract(text: string): string[] {
    const pathRegex = /([a-zA-Z0-9._\-/]+\.[a-zA-Z0-9]+)(?::\d+:\d+)?/g;
    const paths = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = pathRegex.exec(text)) !== null) {
      const candidate = match[1];
      if (PathValidator.isValidPath(candidate, {
        excludedExts: ['js.map', 'd.ts.map', ...PathValidator['DEFAULT_EXCLUDED_EXTS']],
        minLength: 1
      })) {
        paths.add(candidate.replace(/\\/g, '/'));
      }
    }

    return Array.from(paths);
  }
}
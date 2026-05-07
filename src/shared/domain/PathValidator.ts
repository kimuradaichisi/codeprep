/*
 * Copyright 2026 CodePrep Contributors
 */

export interface PathValidationOptions {
  /** 除外するディレクトリ名（部分一致） */
  excludedDirs?: string[];
  /** 除外する拡張子 */
  excludedExts?: string[];
  /** 最小文字数 */
  minLength?: number;
  /** 特殊ファイル名を認識するか */
  allowSpecialFiles?: boolean;
  /** テストファイルパターン（正規表現または拡張子配列） */
  testFilePatterns?: (RegExp | string[])[];
}

export class PathValidator {
  private static readonly DEFAULT_EXCLUDED_DIRS = [
    'node_modules', '.git', 'dist', 'out', 'build', 'coverage', '.idea', '.vscode'
  ];

  private static readonly DEFAULT_EXCLUDED_EXTS = [
    'exe', 'dll', 'so', 'dylib', 'obj', 'o', 'a', 'lib',
    'pyc', 'class', 'jar', 'war', 'ear',
    'log', 'tmp', 'temp', 'swp', 'swo', 'bak', 'old',
    'js.map', 'd.ts.map'
  ];

  private static readonly SPECIAL_FILES = [
    'dockerfile', 'makefile', 'license', 'readme', 'package.json',
    'package-lock.json', 'tsconfig.json', 'jsconfig.json',
    'vitest.config.ts', 'jest.config.js', 'vite.config.ts',
    '.env', '.gitignore', '.eslintrc', '.prettierrc'
  ];

  /** 言語別テストファイルパターン */
  private static readonly DEFAULT_TEST_PATTERNS: (RegExp | string[])[] = [
    // JavaScript/TypeScript
    /\.(test|spec)\.(ts|js|tsx|jsx|mjs|cjs)$/i,
    // Python
    ['_test.py', '_spec.py'],
    // Go
    ['_test.go'],
    // Rust
    ['.rs', 'test.rs'], // libtest.rs など
    // Java/Kotlin/Scala/Groovy
    ['Test.java', 'Test.kt', 'Test.scala', 'Test.groovy'],
    ['Tests.java', 'Tests.kt'],
    // C/C++
    ['_test.cc', '_test.cpp', '_test.cxx', '_test.c++', '_test.c'],
    ['_spec.cc', '_spec.cpp', '_spec.cxx', '_spec.c++', '_spec.c'],
    // Ruby
    ['_test.rb', '_spec.rb'],
    // PHP
    ['Test.php', '.test.php', '_test.php'],
    ['Spec.php', '.spec.php', '_spec.php'],
    // Swift
    ['Tests.swift', 'Test.swift'],
    // C#
    ['.Tests.cs', '.Test.cs', 'Tests.cs', 'Test.cs'],
    // Elixir
    ['_test.exs', '_test.ex'],
    // Haskell
    ['Spec.hs', 'Test.hs'],
    // OCaml
    ['_test.ml', '_spec.ml'],
    // Lua
    ['_spec.lua', '_test.lua'],
    // 汎用パターン
    /\.test\.[a-z]+$/i,
    /\.spec\.[a-z]+$/i,
  ];

  static isValidPath(p: string, options: PathValidationOptions = {}): boolean {
    const {
      excludedDirs = this.DEFAULT_EXCLUDED_DIRS,
      excludedExts = this.DEFAULT_EXCLUDED_EXTS,
      minLength = 2,
      allowSpecialFiles = true,
      testFilePatterns = this.DEFAULT_TEST_PATTERNS
    } = options;

    // 基本チェック
    if (!p || p.length < minLength) return false;
    if (/^\d+\.?$/.test(p)) return false;
    if (/[<>|&;()]/.test(p)) return false;

    // 環境変数っぽいもの
    if (/^[A-Z0-9_]+$/.test(p) && !p.includes('.')) return false;

    // ディレクトリ除外
    const normalized = p.toLowerCase().replace(/\\/g, '/');
    for (const dir of excludedDirs) {
      const pattern = new RegExp(`(^|/)${dir.toLowerCase()}(/|$)`);
      if (pattern.test(normalized)) return false;
    }

    const lastPart = p.split(/[\\/]/).pop() || '';
    if (!lastPart || /^[._-]+$/.test(lastPart)) return false;

    // テストファイルパターンをチェック
    if (testFilePatterns.length > 0 && this.isTestFile(lastPart, testFilePatterns)) {
      return true;
    }

    // 拡張子チェック
    if (lastPart.includes('.') && !lastPart.startsWith('.')) {
      const ext = lastPart.split('.').pop()?.toLowerCase() || '';
      if (excludedExts.includes(ext)) return false;
    }

    // 特殊ファイル名
    if (allowSpecialFiles) {
      const lower = lastPart.toLowerCase();
      if (this.SPECIAL_FILES.includes(lower)) return true;
      if (lower.includes('.config.')) return true;
    }

    // 基本的な妥当性
    const hasExt = /\.[a-z0-9]+$/i.test(p);
    const hasSep = p.includes('/') || p.includes('\\');

    return hasExt || hasSep || p.startsWith('.');
  }

  private static isTestFile(filename: string, patterns: (RegExp | string[])[]): boolean {
    for (const pattern of patterns) {
      if (pattern instanceof RegExp) {
        if (pattern.test(filename)) return true;
      } else {
        // 文字列配列：サフィックスマッチ
        const lower = filename.toLowerCase();
        for (const suffix of pattern) {
          if (lower.endsWith(suffix.toLowerCase())) return true;
        }
      }
    }
    return false;
  }

  /** パッチ機能用：厳密モード（拡張子必須） */
  static isValidFilePath(p: string): boolean {
    // node_modules/@types は型定義として許可
    if (p.toLowerCase().includes('node_modules/@types')) {
        return p.includes('.') || this.SPECIAL_FILES.includes(p.toLowerCase());
    }
    
    return this.isValidPath(p, { minLength: 1 }) &&
            (p.includes('.') || this.SPECIAL_FILES.includes(p.toLowerCase()));
  }

  /** クリップボード用：寛容モード */
  static isValidClipboardPath(p: string): boolean {
    return this.isValidPath(p, {
      testFilePatterns: this.DEFAULT_TEST_PATTERNS
    });
  }

  /** カスタムパターンでテストファイル検出 */
  static isTestFileWithCustomPattern(p: string, customPatterns: (RegExp | string[])[]): boolean {
    return this.isTestFile(p.split(/[\\/]/).pop() || '', customPatterns);
  }
}
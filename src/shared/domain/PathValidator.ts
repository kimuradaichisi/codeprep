/*
 * Copyright 2026 CodePrep Contributors
 */

export interface PathValidationOptions {
  excludedDirs?: string[];
  excludedExts?: string[];
  minLength?: number;
  allowSpecialFiles?: boolean;
  testFilePatterns?: (RegExp | string[])[];
}

/**
 * パスの妥当性を検証するユーティリティ
 * パフォーマンスのため、正規表現の動的生成を避け、Setによる高速検索を行う。
 */
export class PathValidator {
  public static readonly DIRS = new Set(['node_modules', '.git', 'dist', 'out', 'build', 'coverage', '.idea', '.vscode']);
  public static readonly EXTS = new Set(['exe', 'dll', 'so', 'dylib', 'obj', 'o', 'a', 'lib', 'pyc', 'class', 'jar', 'war', 'ear', 'log', 'tmp', 'temp', 'swp', 'swo', 'bak', 'old', 'js.map', 'd.ts.map']);
  public static readonly SPECIAL = new Set(['dockerfile', 'makefile', 'license', 'readme', 'package.json', 'package-lock.json', 'tsconfig.json', 'jsconfig.json', 'vitest.config.ts', 'jest.config.js', 'vite.config.ts', '.env', '.gitignore', '.eslintrc', '.prettierrc']);

  private static readonly DEFAULT_TEST_PATTERNS: (RegExp | string[])[] = [
    /\.(test|spec)\.(ts|js|tsx|jsx|mjs|cjs)$/i,
    ['_test.py', '_spec.py', '_test.go', '.rs', 'test.rs', 'Test.java', 'Test.kt', 'Test.scala', 'Test.groovy'],
    ['_test.cc', '_test.cpp', '_test.rb', '_spec.rb', 'Test.php', 'Tests.swift', '.Tests.cs', '_test.exs'],
    /\.test\.[a-z]+$/i, /\.spec\.[a-z]+$/i
  ];

  public static isValidPath(p: string, options: PathValidationOptions = {}): boolean {
    if (!this.checkBasicFormat(p, options.minLength ?? 2)) return false;

    const normalized = p.toLowerCase().replace(/\\/g, '/');
    if (this.isExcludedDir(normalized, options.excludedDirs)) return false;

    const filename = normalized.split('/').pop() || '';
    return this.validateFile(filename, normalized, options);
  }

  private static checkBasicFormat(p: string, minLen: number): boolean {
    if (!p || p.length < minLen) return false;
    // 123.456 のような数字とドットのみのパターンを排除
    if (/^[\d.]+$/.test(p) || /[<>|&;()]/.test(p)) return false;
    
    const name = p.split(/[\\/]/).pop() || '';
    const isEnvVar = /^[A-Z0-9_]+$/.test(name) && !name.includes('.');
    
    // 環境変数っぽくても、SPECIALリスト（LICENSE等）に含まれるなら許可
    if (isEnvVar && !this.isSpecial(name)) return false;

    return true;
  }

  private static isExcludedDir(path: string, customDirs?: string[]): boolean {
    const dirs = customDirs ? new Set(customDirs.map(d => d.toLowerCase())) : this.DIRS;
    const parts = path.split('/');
    return parts.some(part => dirs.has(part));
  }

  private static validateFile(name: string, full: string, opts: PathValidationOptions): boolean {
    const patterns = opts.testFilePatterns ?? this.DEFAULT_TEST_PATTERNS;
    if (this.isTestFile(name, patterns)) return true;

    if (name.includes('.') && !name.startsWith('.')) {
      const ext = name.split('.').pop() || '';
      const exts = opts.excludedExts ? new Set(opts.excludedExts) : this.EXTS;
      if (exts.has(ext)) return false;
    }

    if (opts.allowSpecialFiles !== false && this.isSpecial(name)) return true;
    return /\.[a-z0-9]+$/i.test(name) || name.startsWith('.');
  }

  private static isSpecial(name: string): boolean {
    return this.SPECIAL.has(name.toLowerCase()) || name.toLowerCase().includes('.config.');
  }

  private static isTestFile(filename: string, patterns: (RegExp | string[])[]): boolean {
    const lower = filename.toLowerCase();
    return patterns.some(p => {
      if (p instanceof RegExp) return p.test(filename);
      return p.some(suffix => lower.endsWith(suffix.toLowerCase()));
    });
  }

  public static isValidFilePath(p: string): boolean {
    const lower = p.toLowerCase();
    if (lower.includes('node_modules/@types')) {
      return p.includes('.') || this.SPECIAL.has(lower);
    }
    return this.isValidPath(p, { minLength: 1 }) && (p.includes('.') || this.isSpecial(p));
  }

  public static isValidClipboardPath(p: string): boolean {
    return this.isValidPath(p, { testFilePatterns: this.DEFAULT_TEST_PATTERNS });
  }
}
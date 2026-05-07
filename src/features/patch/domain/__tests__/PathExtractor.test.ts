/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect } from 'vitest';
import { PathExtractor } from '../PathExtractor';

describe('PathExtractor Unit Tests', () => {
  const extractor = new PathExtractor();

  it('GitHubスタイルのファイルヘッダーを優先すること', () => {
    const context = 'Review this file:\n## File: src/main.ts\n';
    expect(extractor.extractPathFromContext(context)).toBe('src/main.ts');
  });

  it('隠しファイルを正しく認識すること', () => {
    expect(extractor.extractPathFromContext('Edit `.env.local`: ')).toBe('.env.local');
  });

  it('無効なパス候補（環境変数等）を除外すること', () => {
    expect(extractor.extractPathFromContext('Check your `PATH`')).toBe(null);
  });
});
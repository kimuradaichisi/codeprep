/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect } from 'vitest';
import { DirectoryCache } from '../DirectoryCache';

describe('DirectoryCache', () => {
  it('エントリの設定と取得ができること', () => {
    const cache = new DirectoryCache();
    const entries: [string, boolean][] = [
      ['src', true],
      ['package.json', false]
    ];
    cache.set('/root', entries);

    expect(cache.has('/root')).toBe(true);
    expect(cache.get('/root')).toEqual(entries);
    expect(cache.size).toBe(1);
  });

  it('存在しないパスは undefined を返すこと', () => {
    const cache = new DirectoryCache();
    expect(cache.has('/nonexistent')).toBe(false);
    expect(cache.get('/nonexistent')).toBeUndefined();
  });

  it('特定フォルダのキャッシュを削除できること', () => {
    const cache = new DirectoryCache();
    cache.set('/a', [['file1', false]]);
    cache.set('/b', [['file2', false]]);

    cache.clear('/a');
    expect(cache.has('/a')).toBe(false);
    expect(cache.has('/b')).toBe(true);
    expect(cache.size).toBe(1);
  });

  it('全キャッシュをクリアできること', () => {
    const cache = new DirectoryCache();
    cache.set('/a', [['file1', false]]);
    cache.set('/b', [['file2', false]]);

    cache.clear();
    expect(cache.has('/a')).toBe(false);
    expect(cache.has('/b')).toBe(false);
    expect(cache.size).toBe(0);
  });
});

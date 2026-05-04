import { describe, it, expect } from 'vitest';
import { OmitHealer } from '../domain/OmitHealer';

describe('OmitHealer - Multi-Language & Symbol Support', () => {
  const healer = new OmitHealer();

  it('HTMLのコメント形式 (<!-- ... -->) を正しく復元できること', () => {
    const original = '<div class="head">\n  <h1>Title</h1>\n  <p>Text</p>\n</div>';
    const patch = '<div class="head">\n  <!-- ... -->\n  <p>New Text</p>\n</div>';
    const result = healer.heal(original, patch);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value).toContain('<h1>Title</h1>');
      expect(result.value).toContain('<p>New Text</p>');
    }
  });

  it('SQLのコメント形式 (-- ...) を正しく復元できること', () => {
    const original = 'SELECT id, name\nFROM users\nWHERE active = 1;';
    const patch = 'SELECT id, name\n-- ...\nWHERE active = 0;';
    const result = healer.heal(original, patch);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value).toContain('FROM users');
      expect(result.value).toContain('WHERE active = 0;');
    }
  });

  it('Cスタイルのブロックコメント (/* ... */) を正しく復元できること', () => {
    const original = '/* header */\nvoid main() {\n  printf("hello");\n}';
    const patch = '/* header */\nvoid main() {\n  /* ... */\n  exit(0);\n}';
    const result = healer.heal(original, patch);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value).toContain('printf("hello");');
      expect(result.value).toContain('exit(0);');
    }
  });

  it('特殊な複合演算子や記号 (&&, %=, <<=, <>) が保持されること', () => {
    const original = 'if (a && b) {\n  val %= 10;\n}';
    const patch = 'if (a && b) {\n  // ...\n  val <<= 2;\n  if (x <> y) return;\n}';
    const result = healer.heal(original, patch);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value).toContain('val <<= 2;');
      expect(result.value).toContain('if (x <> y)');
    }
  });

  it('日本語を含む省略指示 (// ... 既存のコード ...) を認識できること', () => {
    const original = 'function test() {\n  console.log("A");\n  console.log("B");\n}';
    const patch = 'function test() {\n  // ... 既存のコード ...\n  console.log("C");\n}';
    const result = healer.heal(original, patch);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value).toContain('console.log("A");');
      expect(result.value).toContain('console.log("C");');
    }
  });
});

// src/features/patch/__tests__/OmitHealer.test.ts
import { describe, it, expect } from 'vitest';
import { OmitHealer } from '../domain/OmitHealer';

describe('OmitHealer - Edge Cases & Multi-Lang', () => {
  const healer = new OmitHealer();

  it('HTML のコメント形式に対応できること', () => {
    const original = `<html>\n  <body>\n    <h1>Title</h1>\n    <p>Content</p>\n  </body>\n</html>`;
    const patched = `<html>\n  <!-- ... existing code ... -->\n    <p>Content</p>\n  <!-- ... existing ... -->\n</html>`;
    
    const result = healer.heal(original, patched);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value.code).toContain('<h1>Title</h1>');
      expect(result.value.code).toContain('<body>');
    }
  });

  it('SQL のコメント形式に対応できること', () => {
    const original = `SELECT id, name\nFROM users\nWHERE active = 1\nORDER BY id;`;
    const patched = `-- ... existing ...\nWHERE active = 1\n-- ... existing ...`;
    
    const result = healer.heal(original, patched);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value.code).toContain('SELECT id, name');
      expect(result.value.code).toContain('ORDER BY id;');
    }
  });

  it('ファイルの先頭が省略されているケース', () => {
    const original = `import a\nimport b\n\nconst main = () => {};`;
    const patched = `// ... existing imports ...\n\nconst main = () => {};`;
    
    const result = healer.heal(original, patched);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value.code).toBe(original);
    }
  });

  it('ファイルの末尾が省略されているケース', () => {
    const original = `const a = 1;\nconst b = 2;\nconst c = 3;`;
    const patched = `const a = 1;\n// ... existing code ...`;
    
    const result = healer.heal(original, patched);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value.code).toBe(original);
    }
  });

  it('インデントが微妙に異なる場合でもアンカーを特定できること', () => {
    const original = `class A {\n    void method() {\n        doSomething();\n    }\n}`;
    const patched = `class A {\n// ... existing ...\n        doSomething();\n// ... existing ...\n}`;
    
    const result = healer.heal(original, patched);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value.code).toContain('void method()');
    }
  });

  it('省略語句の揺れ (rest of code, original, etc.) に対応できること', () => {
    const original = `line1\nline2\nline3`;
    const patched = `// ... rest of code ...\nline3`;
    
    const result = healer.heal(original, patched);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value.code).toBe(original);
    }
  });

  it('行途中の空白の差異を無視してマッチングできること', () => {
    const original = `const x = 1;\nconst y = 2;`;
    const patched = `const x=1;\n// ... existing ...\nconst y=2;`;
    
    const result = healer.heal(original, patched);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value.code).toBe(original);
    }
  });
});
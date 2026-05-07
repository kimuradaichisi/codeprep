// src/features/patch/__tests__/OmitHealer.edge.test.ts
import { describe, it, expect } from 'vitest';
import { OmitHealer } from '../domain/OmitHealer';

describe('OmitHealer - Robustness Edge Cases', () => {
  const healer = new OmitHealer();

  it('新規ファイル（空ファイル）に対してパッチを適用できること', () => {
    const original = '';
    const patched = 'line1\nline2\nline3';
    const result = healer.heal(original, patched);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value.code).toBe(patched);
    }
  });

  it('新規ファイル（オリジナルが空）に対してパッチを適用できること', () => {
    const original = '';
    const patch = `
class NewFile:
    def __init__(self):
        pass
    `;
    const result = healer.heal(original, patch);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value.code.trim()).toBe(patch.trim());
    }
  });

  it('同一のアンカーが複数ある場合、正しい順序でマッチングすること', () => {
    const original = 'item\nitem\nitem';
    const patched = 'item\n// ...\nitem'; // 1つ目と3つ目の間を想定
    const result = healer.heal(original, patched);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      // Gap付きマッチ により、真ん中の item が復元されるはず
      expect(result.value.code).toBe('item\nitem\nitem');
    }
  });

  it('省略の直後に新規行があり、その後にアンカーがあるケース', () => {
    const original = 'const a = 1;\nconst b = 2;\nconst c = 3;';
    const patched = 'const a = 1;\n// ...\nconst new_b = 2.5;\nconst c = 3;';
    const result = healer.heal(original, patched);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value.code).toBe('const a = 1;\nconst b = 2;\nconst new_b = 2.5;\nconst c = 3;');
    }
  });

  it('省略の後のアンカーが全く見つからない場合に詳細なエラーを返すこと', () => {
    const original = 'existing line';
    // isLastOmit を避けるため末尾にもう1つomitを追加してアンカー不在エラーを強制
    const patched = 'existing line\n// ...\nnon-existent anchor\n// ...';
    const result = healer.heal(original, patched);
    expect(result.isFailure).toBe(true);
    if (result.isFailure) {
      expect(result.error.message).toContain('Anchor line not found');
      expect(result.error.message).toContain('non-existent anchor');
    }
  });

  it('複雑な多重省略と新規追加の組み合わせ', () => {
    const original = 'start\n1\n2\n3\n4\nend';
    const patched = 'start\n// ...\n2\nnew\n// ...\nend';
    const result = healer.heal(original, patched);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value.code).toBe('start\n1\n2\nnew\n3\n4\nend');
    }
  });
});
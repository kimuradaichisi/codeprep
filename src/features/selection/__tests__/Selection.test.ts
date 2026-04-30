import { describe, it, expect, beforeEach } from 'vitest';
import { Selection } from '../domain/Selection';

describe('Selection (Domain)', () => {
  let selection: Selection;

  beforeEach(() => {
    selection = new Selection();
  });

  it('初期状態は空であること', () => {
    expect(selection.count).toBe(0);
    expect(selection.getPaths()).toEqual([]);
  });

  it('単一のパスを選択・解除できること', () => {
    selection.set('file1.ts', true);
    expect(selection.has('file1.ts')).toBe(true);
    expect(selection.count).toBe(1);

    selection.set('file1.ts', false);
    expect(selection.has('file1.ts')).toBe(false);
    expect(selection.count).toBe(0);
  });

  it('複数のパスを一括追加できること', () => {
    selection.addAll(['file1.ts', 'file2.ts']);
    expect(selection.count).toBe(2);
    expect(selection.has('file1.ts')).toBe(true);
    expect(selection.has('file2.ts')).toBe(true);
  });

  it('選択を全解除できること', () => {
    selection.addAll(['file1.ts', 'file2.ts']);
    selection.clear();
    expect(selection.count).toBe(0);
  });

  it('選択を反転できること', () => {
    const allPaths = ['file1.ts', 'file2.ts', 'file3.ts'];
    selection.set('file1.ts', true);
    
    selection.invert(allPaths);
    
    expect(selection.has('file1.ts')).toBe(false);
    expect(selection.has('file2.ts')).toBe(true);
    expect(selection.has('file3.ts')).toBe(true);
    expect(selection.count).toBe(2);
  });

  it('コンストラクタで初期パスを指定できること', () => {
    const initialSelection = new Selection(['init.ts']);
    expect(initialSelection.has('init.ts')).toBe(true);
    expect(initialSelection.count).toBe(1);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { Selection } from '../Selection';

describe('Selection', () => {
    let selection: Selection;

    beforeEach(() => {
        selection = new Selection();
    });

    it('should add multiple paths at once', () => {
        selection.addAll(['a.ts', 'b.ts', 'c.ts']);
        expect(selection.count).toBe(3);
        expect(selection.has('a.ts')).toBe(true);
    });

    it('should clear all selections', () => {
        selection.addAll(['a.ts', 'b.ts']);
        selection.clear();
        expect(selection.count).toBe(0);
    });

    it('should invert selection state correctly', () => {
        selection.addAll(['a.ts']);
        const universe = ['a.ts', 'b.ts', 'c.ts'];
        selection.invert(universe);
        expect(selection.has('a.ts')).toBe(false);
        expect(selection.has('b.ts')).toBe(true);
        expect(selection.has('c.ts')).toBe(true);
    });
});
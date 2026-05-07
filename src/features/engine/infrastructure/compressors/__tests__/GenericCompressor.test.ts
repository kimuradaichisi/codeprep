import { describe, it, expect } from 'vitest';
import { GenericCompressor } from '../GenericCompressor';

describe('GenericCompressor', () => {
  const compressor = new GenericCompressor();

  it('複数行のブロックを // ... existing code ... に置換すること', () => {
    const input = 'function test() {\n  console.log("hello");\n  return true;\n}';
    const result = compressor.compress(input);
    expect(result).toContain('// ... existing code ...');
  });

  it('1行の短いブロックは置換しないこと', () => {
    const input = 'const obj = { key: "value" };';
    const result = compressor.compress(input);
    expect(result).toBe(input);
  });
});
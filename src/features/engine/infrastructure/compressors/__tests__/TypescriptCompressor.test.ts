import { describe, it, expect } from 'vitest';
import { TypescriptCompressor } from '../TypescriptCompressor';

describe('TypescriptCompressor', () => {
  const compressor = new TypescriptCompressor();

  it('関数宣言の実装を圧縮できること', () => {
    const input = 'function add(a: number, b: number) { return a + b; }';
    const result = compressor.compress(input);
    expect(result).toContain('function add(a: number, b: number)');
    expect(result).toContain('// ... existing code ...');
  });

  it('アロー関数の実装を圧縮できること', () => {
    const input = 'const sub = (a, b) => { return a - b; };';
    const result = compressor.compress(input);
    expect(result).toContain('(a, b) =>');
    expect(result).toContain('// ... existing code ...');
  });

  it('クラスメソッドの実装を圧縮できること', () => {
    const input = 'class Test { save() { console.log("saved"); } }';
    const result = compressor.compress(input);
    expect(result).toContain('save()');
    expect(result).toContain('// ... existing code ...');
  });
});
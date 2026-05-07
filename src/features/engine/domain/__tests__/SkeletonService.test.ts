/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect } from 'vitest';
import { SkeletonService } from '../SkeletonService';

describe('SkeletonService', () => {
  const service = new SkeletonService();

  it('クラスとメソッドの構造を保持し、実装を省略すること', () => {
    const input = [
      'export class Calculator {',
      '  public add(a: number, b: number): number {',
      '    return a + b;',
      '  }',
      '}'
    ].join('\n');

    const result = service.extract(input);
    
    expect(result).toContain('export class Calculator {');
    expect(result).toContain('public add(a: number, b: number): number {');
    expect(result).toContain('// ... implementation omitted');
    expect(result).toContain('}');
    expect(result).not.toContain('return a + b;');
  });

  it('型定義やインターフェースをそのまま保持すること', () => {
    const input = 'export type ID = string;\nexport interface User { id: ID; }';
    const result = service.extract(input);
    expect(result).toBe(input);
  });

  it('インポート文を保持すること', () => {
    const input = 'import { x } from "y";\nconst a = 1;';
    const result = service.extract(input);
    expect(result).toContain('import { x }');
    expect(result).toContain('const a = 1;');
  });
});
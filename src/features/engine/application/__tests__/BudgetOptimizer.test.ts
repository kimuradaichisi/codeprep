/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, expect, it, vi } from 'vitest';
import { BudgetOptimizer } from '../BudgetOptimizer';
import { SkeletonService } from '../../infrastructure/SkeletonService';

describe('BudgetOptimizer', () => {
  const mockSkeletonService = {
    generateSkeleton: vi.fn((filename, code) => `// skeleton: ${filename}`)
  } as unknown as SkeletonService;

  it('preserves files under budget limit', () => {
    const optimizer = new BudgetOptimizer(mockSkeletonService);
    const files = [
      { path: 'src/a.ts', content: 'const a = 1;' },
      { path: 'src/b.ts', content: 'const b = 2;' }
    ];
    // 1トークン=4バイト換算で200バイト上限 (十分大きい)
    const result = optimizer.optimize({ files, byteLimit: 200 });

    expect(result).toEqual([
      { path: 'src/a.ts', content: 'const a = 1;' },
      { path: 'src/b.ts', content: 'const b = 2;' }
    ]);
  });

  it('prioritizes active file and auto-degrades other files to skeleton when budget limit is tight', () => {
    const optimizer = new BudgetOptimizer(mockSkeletonService);
    const files = [
      { path: 'src/a.ts', content: 'a'.repeat(30) }, // 優先ではないファイル (大)
      { path: 'src/b.ts', content: 'b'.repeat(10) }, // アクティブファイル
      { path: 'src/c.ts', content: 'c'.repeat(5) }   // 優先ではないファイル (小)
    ];

    // byteLimit を 40 バイトに制限。
    // アクティブファイル 'src/b.ts' が最優先で Full (33B + 10B payload ＝ 43B ... あれ、payload size の estimate があるか？)
    // 待て、BudgetOptimizer 内でのサイズ計算は `new TextEncoder().encode(content).byteLength` を使っている。
    // そのため、ファイルサイズは content の純粋な byte 数である。
    // files[0] (src/a.ts): 30B
    // files[1] (src/b.ts): 10B
    // files[2] (src/c.ts): 5B
    // activePath: 'src/b.ts' 
    // ソート順：
    // 1. src/b.ts (active): 10B, score: 1,000,000,000
    // 2. src/c.ts (size 5): 5B, score: 99,999,995
    // 3. src/a.ts (size 30): 30B, score: 99,999,970
    //
    // 制限: byteLimit = 20 B
    // 順次パッキング：
    // 1. src/b.ts: 10B (<= 20B) -> Full で追加。残予算: 10B
    // 2. src/c.ts: 5B (<= 10B) -> Full で追加。残予算: 5B
    // 3. src/a.ts: 30B (> 5B) -> skeleton に縮退
    //    skeleton content: '// skeleton: src/a.ts' (21B)
    //    skeleton size: 21B (> 5B) -> 予算オーバーのため除外。
    
    const onExclude = vi.fn();
    const result = optimizer.optimize(
      { files, byteLimit: 20, activePath: 'src/b.ts' },
      onExclude
    );

    expect(result).toEqual([
      { path: 'src/b.ts', content: 'bbbbbbbbbb' },
      { path: 'src/c.ts', content: 'ccccc' }
    ]);
    expect(onExclude).toHaveBeenCalledWith('src/a.ts');
  });

  it('keeps skeleton if skeleton content fits budget', () => {
    const optimizer = new BudgetOptimizer(mockSkeletonService);
    const files = [
      { path: 'src/a.ts', content: 'a'.repeat(30) }
    ];
    // limit を 25B に制限。Full (30B) は入らないが、skeleton (21B) なら入る。
    const result = optimizer.optimize({ files, byteLimit: 25 });

    expect(result).toEqual([
      { path: 'src/a.ts', content: '// skeleton: src/a.ts', skeleton: true }
    ]);
  });
});

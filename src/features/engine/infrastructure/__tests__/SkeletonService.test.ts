import { describe, it, expect } from 'vitest';
import { SkeletonService } from '../SkeletonService';

describe('SkeletonService', () => {
  it('拡張子に応じて適切な圧縮機を選択すること', () => {
    const service = new SkeletonService();
    const tsCode = 'function a() { return 1; }';
    const result = service.generateSkeleton('test.ts', tsCode);
    
    // TypescriptCompressorが呼ばれていることを確認（ASTによる整形が含まれるはず）
    expect(result).toContain('function a()');
    expect(result).toContain('// ... existing code ...');
  });

  it('未知の拡張子ではGenericCompressorを使用すること', () => {
    const service = new SkeletonService();
    // ✅ Ruby(def)ではなく、中括弧を使う言語(C言語等)で汎用ロジックをテストする
    const cCode = 'void hello() {\n  printf("hi");\n  return;\n}';
    const result = service.generateSkeleton('test.c', cCode);
    
    expect(result).toContain('// ... existing code ...');
  });
});
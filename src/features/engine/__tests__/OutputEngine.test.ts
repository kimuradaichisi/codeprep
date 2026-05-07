/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { OutputEngine } from '../domain/OutputEngine';
import { OutputOptions } from '../domain/OutputOptions';

describe('OutputEngine (Baseline & Context Intelligence)', () => {
  let engine: OutputEngine;
  const defaultOptions: OutputOptions = {
    format: 'markdown',
    includeMetadata: true,
    removeComments: false,
    includeEmptyLines: true,
    outputMode: 'everything'
  };

  beforeEach(() => {
    engine = new OutputEngine();
  });

  it('Markdown 形式で正しく出力されること', () => {
    const files = [{ path: 'test.ts', content: 'console.log("hi");' }];
    const result = engine.generate(files, defaultOptions, 'Hello');
    
    expect(result.content).toContain('Hello');
    expect(result.content).toContain('## Directory Structure');
    expect(result.content).toContain('└── test.ts');
    expect(result.content).toContain('## File: test.ts');
    expect(result.content).toContain('console.log("hi");');
  });

  it('Skeleton Mode: 実装を省略し、シグネチャと構造のみを保持すること', () => {
    const content = [
        'export class Test {',
        '  constructor() {',
        '    console.log("secret");',
        '  }',
        '  public run(): boolean {',
        '    return true;',
        '  }',
        '}'
    ].join('\n');
    const files = [{ path: 'test.ts', content }];
    const options = { ...defaultOptions, skeletonMode: true };
    const result = engine.generate(files, options);
    
    expect(result.content).toContain('export class Test');
    expect(result.content).toContain('public run(): boolean');
    expect(result.content).toContain('// ...'); // 省略記号
    expect(result.content).not.toContain('console.log("secret")');
    expect(result.content).not.toContain('return true');
  });

  it('コメント除去が機能すること', () => {
    const files = [{ path: 'test.ts', content: '// comment\nconst a = 1; /* block */' }];
    const options = { ...defaultOptions, removeComments: true };
    const result = engine.generate(files, options);
    
    expect(result.content).not.toContain('// comment');
    expect(result.content).not.toContain('/* block */');
    expect(result.content).toContain('const a = 1;');
  });

  it('空行除去が機能すること', () => {
    const files = [{ path: 'test.ts', content: 'line1\n\nline2' }];
    const options = { ...defaultOptions, includeEmptyLines: false };
    const result = engine.generate(files, options);
    
    expect(result.content).toContain('line1\nline2');
    expect(result.content).not.toContain('line1\n\nline2');
  });

  it('XML 形式で正しく出力されること', () => {
    const files = [{ path: 'test.ts', content: 'const a = 1;' }];
    const options = { ...defaultOptions, format: 'xml' as const };
    const result = engine.generate(files, options, 'Prompt');
    
    expect(result.content).toContain('<repository>');
    expect(result.content).toContain('<instruction>\nPrompt\n  </instruction>');
    expect(result.content).toContain('<file path="test.ts">');
  });

  it('JSON 形式で正しく出力されること', () => {
    const files = [{ path: 'test.ts', content: 'const a = 1;' }];
    const options = { ...defaultOptions, format: 'json' as const };
    const result = engine.generate(files, options, 'Prompt');
    
    const json = JSON.parse(result.content);
    expect(json.prompt).toBe('Prompt');
    expect(json.repository[0].path).toBe('test.ts');
  });

  it('バッククォートを含むコンテンツでデリミタが調整されること', () => {
    const files = [{ path: 'test.md', content: '```\ncode\n```' }];
    const result = engine.generate(files, defaultOptions);
    
    expect(result.content).toContain('````\n```\ncode\n```\n````');
    expect(result.content).toContain('## Directory Structure\n````');
  });

  it('巨大ファイル・ガード: 指定サイズを超える場合、内容を省略して警告を表示すること', () => {
    const largeContent = 'a'.repeat(2048);
    const files = [{ path: 'large.ts', content: largeContent }];
    const options = { ...defaultOptions, maxFileSizeKB: 1 };
    
    const result = engine.generate(files, options);
    
    expect(result.content).toContain('[WARNING] File size exceeds 1KB');
    expect(result.content).not.toContain(largeContent);
  });

  it('XML/JSON 形式でも巨大ファイルが省略されること', () => {
    const files = [{ path: 'large.ts', content: 'a'.repeat(2048) }];
    const options = { ...defaultOptions, maxFileSizeKB: 1 };
    
    const xml = engine.generate(files, { ...options, format: 'xml' });
    expect(xml.content).toContain('[WARNING] File size exceeds 1KB');

    const json = JSON.parse(engine.generate(files, { ...options, format: 'json' }).content);
    expect(json.repository[0].content).toContain('[WARNING] File size exceeds 1KB');
  });
});
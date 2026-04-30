import { describe, it, expect, beforeEach } from 'vitest';
import { OutputEngine } from '../domain/OutputEngine';
import { OutputOptions } from '../domain/OutputOptions';

describe('OutputEngine', () => {
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
    
    // デリミタが ```` になっているはず
    expect(result.content).toContain('````\n```\ncode\n```\n````');
    // デリミタとして ``` が使われていないこと（行の開始が ``` で終わる箇所がデリミタ以外にないこと）
    // ディレクトリ構造のデリミタも ```` になっているはず
    expect(result.content).toContain('## Directory Structure\n````');
  });
});

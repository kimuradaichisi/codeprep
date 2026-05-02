import { describe, it, expect } from 'vitest';
import { PromptProcessor } from '../PromptProcessor';

describe('PromptProcessor', () => {
  const processor = new PromptProcessor();

  it('{{datetime}} が現在の日時形式に置換されること', () => {
    const template = 'Time: {{datetime}}';
    const result = processor.process(template, { files: [] });
    
    expect(result).not.toContain('{{datetime}}');
    // 日本語環境や英語環境で形式が異なるため、何らかの文字列が入っていることを確認
    expect(result).toMatch(/Time: .+/);
  });

  it('{{language}} が指定した言語に置換されること', () => {
    const template = 'Lang: {{language}}';
    const result = processor.process(template, { language: 'ja', files: [] });
    
    expect(result).toBe('Lang: ja');
  });

  it('{{tree}} がディレクトリ構造に置換されること', () => {
    const template = 'Tree:\n{{tree}}';
    const files = ['src/main.ts', 'src/utils/helper.ts'];
    const result = processor.process(template, { files });
    
    expect(result).toContain('src');
    expect(result).toContain('main.ts');
    expect(result).toContain('utils');
    expect(result).toContain('helper.ts');
    expect(result).not.toContain('{{tree}}');
  });

  it('複数の変数が同時に置換されること', () => {
    const template = '{{language}} update: {{datetime}}';
    const result = processor.process(template, { language: 'en', files: [] });
    
    expect(result).toContain('en update: ');
    expect(result).not.toContain('{{language}}');
    expect(result).not.toContain('{{datetime}}');
  });

  it('変数が存在しない場合はそのまま返されること', () => {
    const template = 'No variables here';
    const result = processor.process(template, { files: [] });
    
    expect(result).toBe('No variables here');
  });

  it('重複する変数がすべて置換されること', () => {
    const template = '{{language}} and {{language}}';
    const result = processor.process(template, { language: 'ja', files: [] });
    
    expect(result).toBe('ja and ja');
  });

  it('ファイルリストが空の場合、{{tree}} は置換されないこと', () => {
    const template = 'Tree: {{tree}}';
    const result = processor.process(template, { files: [] });
    
    expect(result).toBe('Tree: {{tree}}');
  });
});

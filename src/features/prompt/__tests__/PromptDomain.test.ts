import { describe, it, expect } from 'vitest';
import { PromptTemplate } from '../domain/PromptTemplate';
import { PromptCollection } from '../domain/PromptCollection';

describe('Prompt Domain Logic', () => {
  describe('PromptTemplate', () => {
    it('正常に生成できること', () => {
      const template = new PromptTemplate('Review', 'Please review.');
      expect(template.name).toBe('Review');
      expect(template.content).toBe('Please review.');
    });

    it('名前が空の場合はエラーになること', () => {
      expect(() => new PromptTemplate('', 'content')).toThrow();
      expect(() => new PromptTemplate('  ', 'content')).toThrow();
    });

    it('サマリーが正しく生成されること', () => {
      const longContent = 'a'.repeat(100);
      const template = new PromptTemplate('Long', longContent);
      expect(template.summary.length).toBe(50);
      expect(template.summary).toContain('...');
    });
  });

  describe('PromptCollection', () => {
    it('Recordから生成および再変換ができること', () => {
      const record = { 'A': 'Content A', 'B': 'Content B' };
      const collection = PromptCollection.fromRecord(record);
      expect(collection.all.length).toBe(2);
      expect(collection.toRecord()).toEqual(record);
    });

    it('マージが正しく動作すること', () => {
      const col1 = PromptCollection.fromRecord({ 'A': 'Old A', 'B': 'B' });
      const col2 = PromptCollection.fromRecord({ 'A': 'New A', 'C': 'C' });
      
      col1.merge(col2);
      
      const result = col1.toRecord();
      expect(result['A']).toBe('New A'); // 上書き
      expect(result['B']).toBe('B');     // 維持
      expect(result['C']).toBe('C');     // 追加
    });

    it('名前で検索できること', () => {
      const collection = PromptCollection.fromRecord({ 'Target': 'Found it' });
      const found = collection.findByName('Target');
      expect(found?.content).toBe('Found it');
      expect(collection.findByName('Unknown')).toBeUndefined();
    });
  });
});

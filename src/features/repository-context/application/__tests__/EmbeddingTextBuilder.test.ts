import { describe, expect, it } from 'vitest';
import type { CodeSymbolEntry } from '../../domain/CodeSymbolEntry';
import type { MarkdownSectionEntry } from '../../domain/MarkdownSectionEntry';
import {
  CURRENT_EMBEDDING_TEXT_FORMAT_VERSION,
  EmbeddingTextBuilder,
} from '../EmbeddingTextBuilder';

describe('EmbeddingTextBuilder', () => {
  const builder = new EmbeddingTextBuilder();

  it('formats format version as 1', () => {
    expect(CURRENT_EMBEDDING_TEXT_FORMAT_VERSION).toBe(1);
  });

  it('builds embedding text for hierarchical markdown section', () => {
    const entry: MarkdownSectionEntry = {
      entryId: 'p:docs/refund.md#sec:3:Order > Refund > Dup:10',
      projectId: 'p',
      relativePath: 'docs/refund.md',
      kind: 'markdown-section',
      headingLevel: 3,
      headingText: 'Duplicate Prevention',
      headingPath: ['Order', 'Refund', 'Duplicate Prevention'],
      startLine: 10,
      endLine: 15,
      content: '### Duplicate Prevention\nA refund must not be applied twice.',
    };

    const text = builder.build(entry);
    expect(text).toContain('File: docs/refund.md');
    expect(text).toContain('Section: Order > Refund > Duplicate Prevention');
    expect(text).toContain('Heading: Duplicate Prevention');
    expect(text).toContain('A refund must not be applied twice.');
  });

  it('builds embedding text for root markdown section', () => {
    const entry: MarkdownSectionEntry = {
      entryId: 'p:docs/readme.md#sec:0:root:1',
      projectId: 'p',
      relativePath: 'docs/readme.md',
      kind: 'markdown-section',
      headingLevel: 0,
      headingText: '',
      headingPath: [],
      startLine: 1,
      endLine: 3,
      content: 'Overview documentation.',
    };

    const text = builder.build(entry);
    expect(text).toContain('Section: (root)');
    expect(text).toContain('Heading: (root)');
    expect(text).toContain('Overview documentation.');
  });

  it('builds embedding text for code symbol with docComment', () => {
    const entry: CodeSymbolEntry = {
      entryId: 'p:src/OrderService.ts#sym:method:OrderService.refund:5',
      projectId: 'p',
      relativePath: 'src/OrderService.ts',
      kind: 'code-symbol',
      symbolKind: 'method',
      symbolName: 'refund',
      containerName: 'OrderService',
      signature: 'async refund(orderId: string): Promise<void>',
      docComment: '/** Prevents duplicate refunds. */',
      startLine: 5,
      endLine: 10,
    };

    const text = builder.build(entry);
    expect(text).toContain('File: src/OrderService.ts');
    expect(text).toContain('Symbol: OrderService.refund');
    expect(text).toContain('Kind: method');
    expect(text).toContain('Declaration:\nasync refund(orderId: string): Promise<void>');
    expect(text).toContain('Documentation:\n/** Prevents duplicate refunds. */');
  });

  it('builds embedding text for code symbol without docComment', () => {
    const entry: CodeSymbolEntry = {
      entryId: 'p:src/types.ts#sym:type:OrderId:1',
      projectId: 'p',
      relativePath: 'src/types.ts',
      kind: 'code-symbol',
      symbolKind: 'type',
      symbolName: 'OrderId',
      containerName: '',
      signature: 'type OrderId = string',
      startLine: 1,
      endLine: 1,
    };

    const text = builder.build(entry);
    expect(text).toContain('Symbol: OrderId');
    expect(text).not.toContain('Documentation:');
  });

  it('builds query embedding text prefixing Task:', () => {
    const query = builder.buildQuery('返品時の二重返金を調査する');
    expect(query).toBe('Task:\n返品時の二重返金を調査する');
  });
});

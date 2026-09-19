// src/features/repository-context/infrastructure/workingset/__tests__/GranularityValidationOracle.test.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect } from 'vitest';
import { TypeScriptSymbolExtractor } from '../../code/TypeScriptSymbolExtractor';
import { MarkdownSectionExtractor } from '../../markdown/MarkdownSectionExtractor';
import { DefaultSourceExtractor } from '../DefaultSourceExtractor';
import type { Project } from '../../../domain/Project';
import type { FileContentPort } from '../../../application/ports';

describe('Granularity Validation Oracle (SYMBOL_RANGE & DOC_SECTION)', () => {
  const tsExtractor = new TypeScriptSymbolExtractor();
  const mdExtractor = new MarkdownSectionExtractor();
  const project: Project = { id: 'test-p', name: 'Test', rootPath: '/test', excludePatterns: [] };

  const sampleTypeScriptCode = [
    '// Line 1: Header',
    'export interface OrderConfig {', // Line 2
    '  timeoutMs: number;', // Line 3
    '}', // Line 4
    '', // Line 5
    'export class OrderProcessor {', // Line 6
    '  constructor(private readonly config: OrderConfig) {}', // Line 7
    '', // Line 8
    '  public processOrder(orderId: string): boolean {', // Line 9
    '    const valid = orderId.length > 0;', // Line 10
    '    return valid;', // Line 11
    '  }', // Line 12
    '}', // Line 13
    '', // Line 14
    'export function calculateTax(amount: number): number {', // Line 15
    '  return amount * 0.1;', // Line 16
    '}', // Line 17
    '', // Line 18
    'export type OrderResult = "SUCCESS" | "FAILURE";', // Line 19
  ].join('\n');

  const sampleMarkdownDoc = [
    '# Order Processing Guide', // Line 1
    '', // Line 2
    'This guide explains how orders are processed.', // Line 3
    '', // Line 4
    '## Validation Rules', // Line 5
    '', // Line 6
    '1. Order ID must not be empty.', // Line 7
    '2. Payment must be authorized.', // Line 8
    '', // Line 9
    '## Code Sample', // Line 10
    '```typescript', // Line 11
    '// Sample code block', // Line 12
    'const orderId = "123";', // Line 13
    '```', // Line 14
    'End of code sample.', // Line 15
  ].join('\n');

  it('validates 5 SYMBOL_RANGE samples with exact boundaries and no overflow', async () => {
    const symbols = tsExtractor.extract('p1', 'OrderProcessor.ts', sampleTypeScriptCode);

    // 1. Interface: OrderConfig (Line 2)
    const symInterface = symbols.find((s) => s.symbolName === 'OrderConfig');
    expect(symInterface).toBeDefined();
    expect(symInterface?.startLine).toBe(2);
    expect(symInterface?.symbolKind).toBe('interface');

    // 2. Class: OrderProcessor (Line 6)
    const symClass = symbols.find((s) => s.symbolName === 'OrderProcessor');
    expect(symClass).toBeDefined();
    expect(symClass?.startLine).toBe(6);
    expect(symClass?.symbolKind).toBe('class');

    // 3. Method: processOrder (Line 9)
    const symMethod = symbols.find((s) => s.symbolName === 'processOrder');
    expect(symMethod).toBeDefined();
    expect(symMethod?.startLine).toBe(9);
    expect(symMethod?.symbolKind).toBe('method');

    // 4. Function: calculateTax (Line 15)
    const symFunc = symbols.find((s) => s.symbolName === 'calculateTax');
    expect(symFunc).toBeDefined();
    expect(symFunc?.startLine).toBe(15);
    expect(symFunc?.symbolKind).toBe('function');

    // 5. Type: OrderResult (Line 19)
    const symType = symbols.find((s) => s.symbolName === 'OrderResult');
    expect(symType).toBeDefined();
    expect(symType?.startLine).toBe(19);
    expect(symType?.symbolKind).toBe('type');

    // Verify DefaultSourceExtractor extraction on range [9, 12] (processOrder)
    const mockFileContent: FileContentPort = {
      canRead: async () => true,
      read: async () => sampleTypeScriptCode,
    };
    const sourceExtractor = new DefaultSourceExtractor(mockFileContent);
    const extracted = await sourceExtractor.extract(project, 'OrderProcessor.ts', 'SYMBOL_RANGE', [
      { startLine: 9, endLine: 12, name: 'processOrder' },
    ]);

    expect(extracted.finalGranularity).toBe('SYMBOL_RANGE');
    expect(extracted.content).toContain('public processOrder(orderId: string): boolean {');
    expect(extracted.content).toContain('return valid;');
    expect(extracted.content).not.toContain('calculateTax'); // No next symbol overflow
    expect(extracted.content).not.toContain('OrderConfig'); // No preceding symbol overflow
  });

  it('validates 3 DOC_SECTION samples with exact boundaries and no overflow', async () => {
    const sections = mdExtractor.extract('p1', 'guide.md', sampleMarkdownDoc);

    // 1. H1: Order Processing Guide (Lines 1-3)
    const sec1 = sections[0];
    expect(sec1.headingText).toBe('Order Processing Guide');
    expect(sec1.startLine).toBe(1);
    expect(sec1.endLine).toBe(3);
    expect(sec1.content).toContain('# Order Processing Guide');
    expect(sec1.content).not.toContain('## Validation Rules');

    // 2. H2: Validation Rules (Lines 5-8)
    const sec2 = sections[1];
    expect(sec2.headingText).toBe('Validation Rules');
    expect(sec2.startLine).toBe(5);
    expect(sec2.endLine).toBe(8);
    expect(sec2.content).toContain('1. Order ID must not be empty.');
    expect(sec2.content).not.toContain('## Code Sample');

    // 3. H2: Code Sample (Lines 10-15)
    const sec3 = sections[2];
    expect(sec3.headingText).toBe('Code Sample');
    expect(sec3.startLine).toBe(10);
    expect(sec3.endLine).toBe(15);
    expect(sec3.content).toContain('```typescript');
    expect(sec3.content).toContain('End of code sample.');

    // Verify DefaultSourceExtractor on sec2 [5, 8]
    const mockFileContent: FileContentPort = {
      canRead: async () => true,
      read: async () => sampleMarkdownDoc,
    };
    const sourceExtractor = new DefaultSourceExtractor(mockFileContent);
    const extracted = await sourceExtractor.extract(project, 'guide.md', 'DOC_SECTION', [
      { startLine: sec2.startLine, endLine: sec2.endLine, name: sec2.headingText },
    ]);

    expect(extracted.finalGranularity).toBe('DOC_SECTION');
    expect(extracted.content).toContain('## Validation Rules');
    expect(extracted.content).toContain('Order ID must not be empty.');
    expect(extracted.content).not.toContain('# Order Processing Guide');
    expect(extracted.content).not.toContain('## Code Sample');
  });

  it('safely falls back to FULL_FILE when range is empty or invalid', async () => {
    const mockFileContent: FileContentPort = {
      canRead: async () => true,
      read: async () => 'line 1\nline 2',
    };
    const sourceExtractor = new DefaultSourceExtractor(mockFileContent);
    const fallback = await sourceExtractor.extract(project, 'sample.ts', 'SYMBOL_RANGE', []);
    expect(fallback.finalGranularity).toBe('FULL_FILE');
    expect(fallback.content).toBe('line 1\nline 2');
  });
});

import { describe, expect, it } from 'vitest';
import { TypeScriptSymbolExtractor } from '../TypeScriptSymbolExtractor';

describe('TypeScriptSymbolExtractor', () => {
  const extractor = new TypeScriptSymbolExtractor();
  const projectId = 'proj-1';

  it('supports .ts, .tsx, .js, .jsx and ignores other extensions', () => {
    expect(extractor.supports('src/index.ts')).toBe(true);
    expect(extractor.supports('src/App.tsx')).toBe(true);
    expect(extractor.supports('src/index.js')).toBe(true);
    expect(extractor.supports('src/App.jsx')).toBe(true);
    expect(extractor.supports('README.md')).toBe(false);
    expect(extractor.supports('config.json')).toBe(false);
  });

  it('extracts class, method, and JSDoc from OrderService.ts fixture', () => {
    const code = [
      'export class OrderService {',
      '  /**',
      '   * Create a new order',
      '   */',
      '  async createOrder(request: OrderRequest): Promise<OrderResult> {',
      '    return { success: true };',
      '  }',
      '}',
    ].join('\n');

    const symbols = extractor.extract(projectId, 'OrderService.ts', code);
    expect(symbols).toHaveLength(2);

    expect(symbols[0].symbolKind).toBe('class');
    expect(symbols[0].symbolName).toBe('OrderService');
    expect(symbols[0].containerName).toBe('');
    expect(symbols[0].startLine).toBe(1);
    expect(symbols[0].entryId).toBe('proj-1:OrderService.ts#sym:class:OrderService:1');

    expect(symbols[1].symbolKind).toBe('method');
    expect(symbols[1].symbolName).toBe('createOrder');
    expect(symbols[1].containerName).toBe('OrderService');
    expect(symbols[1].startLine).toBe(5);
    expect(symbols[1].entryId).toBe('proj-1:OrderService.ts#sym:method:OrderService.createOrder:5');
    expect(symbols[1].docComment).toContain('Create a new order');
  });

  it('extracts interface from ReturnPolicy.ts fixture', () => {
    const code = [
      'export interface ReturnPolicy {',
      '  canReturn(item: Item): boolean;',
      '}',
    ].join('\n');

    const symbols = extractor.extract(projectId, 'ReturnPolicy.ts', code);
    expect(symbols).toHaveLength(1);
    expect(symbols[0].symbolKind).toBe('interface');
    expect(symbols[0].symbolName).toBe('ReturnPolicy');
    expect(symbols[0].startLine).toBe(1);
    expect(symbols[0].entryId).toBe('proj-1:ReturnPolicy.ts#sym:interface:ReturnPolicy:1');
  });

  it('extracts functions, arrow functions, constants, types, and enums', () => {
    const code = [
      'export function calculateTax(amount: number): number { return amount * 0.1; }',
      'export const processItem = (id: string) => { return id; };',
      'export const MAX_RETRIES = 3;',
      'export type OrderStatus = "pending" | "shipped";',
      'export enum Priority { LOW, HIGH }',
    ].join('\n');

    const symbols = extractor.extract(projectId, 'types.ts', code);
    expect(symbols).toHaveLength(5);
    expect(symbols[0].symbolKind).toBe('function');
    expect(symbols[0].symbolName).toBe('calculateTax');
    expect(symbols[1].symbolKind).toBe('function');
    expect(symbols[1].symbolName).toBe('processItem');
    expect(symbols[2].symbolKind).toBe('constant');
    expect(symbols[2].symbolName).toBe('MAX_RETRIES');
    expect(symbols[3].symbolKind).toBe('type');
    expect(symbols[3].symbolName).toBe('OrderStatus');
    expect(symbols[4].symbolKind).toBe('enum');
    expect(symbols[4].symbolName).toBe('Priority');
  });

  it('handles syntax errors gracefully without throwing', () => {
    const code = 'export class Broken { const invalid syntax !! @#$ ';
    const symbols = extractor.extract(projectId, 'broken.ts', code);
    expect(Array.isArray(symbols)).toBe(true);
  });
});

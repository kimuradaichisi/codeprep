// src/features/repository-context/infrastructure/formatting/__tests__/ContextPackV2Formatter.test.ts
import { describe, expect, it } from 'vitest';
import type { ContextPackV2 } from '../../../domain/workingset';
import {
  formatContextPackV2Markdown,
  formatContextPackV2Content,
} from '../ContextPackV2Formatter';

describe('ContextPackV2Formatter', () => {
  const samplePack: ContextPackV2 = {
    schemaVersion: '2',
    task: 'Fix payment timeout',
    strategy: 'knowledge-subgraph',
    confidence: {},
    workingSet: {
      core: [
        {
          nodeId: 'node:1',
          relativePath: 'src/pay/PaymentService.ts',
          role: 'target',
          tier: 'core',
          score: 1.0,
          estimatedTokens: 120,
          inclusionReasons: ['seed:exactMatch'],
          provenance: 'graph',
          relationPaths: [],
        },
      ],
      supporting: [],
      recallReserve: [],
    },
    context: [
      {
        path: 'src/pay/PaymentService.ts',
        role: 'target',
        tier: 'core',
        granularity: 'SYMBOL_RANGE',
        selectedRanges: [{ startLine: 10, endLine: 25 }],
        estimatedTokens: 120,
        score: 1.0,
        reasons: ['seed:exactMatch'],
        provenance: 'graph',
        relationPaths: [],
        content: 'class PaymentService { process() {} }',
      },
    ],
    excluded: [],
    metrics: {
      subgraphNodes: 5,
      workingSetEntries: 1,
      contextFiles: 1,
      contextRanges: 1,
      estimatedTokens: 120,
      compressionRatio: 0.8,
      budgetDecision: {
        source: 'adaptive',
        scope: 'narrow',
        budget: { maxFiles: 10, maxEstimatedTokens: 12000, maxNodes: 30, maxBytes: 50000 },
        recallReserveLimit: 2,
        reasons: ['narrow-scope'],
        signals: [],
      },
    },
  };

  it('formats markdown with header and core working set', () => {
    const md = formatContextPackV2Markdown(samplePack);
    expect(md).toContain('# CodePrep Context Pack v2');
    expect(md).toContain('**Task:** Fix payment timeout');
    expect(md).toContain('### Core (1)');
    expect(md).toContain('src/pay/PaymentService.ts');
  });

  it('formats content with explicit granularity and line ranges', () => {
    const content = formatContextPackV2Content(samplePack);
    expect(content).toContain('// === src/pay/PaymentService.ts [CORE | TARGET | SYMBOL_RANGE] (L10-L25) ===');
    expect(content).toContain('class PaymentService { process() {} }');
  });
});

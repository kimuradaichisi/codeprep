// @vitest-environment jsdom
// apps/desktop/renderer/components/ContextPackWorkingSetView.test.tsx
/*
 * Copyright 2026 CodePrep Contributors
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { ContextPackWorkingSetView } from './ContextPackWorkingSetView';
import type { ContextPackV2 } from '../../../../src/features/repository-context/domain/workingset';

describe('ContextPackWorkingSetView', () => {
  const dummyPack: ContextPackV2 = {
    schemaVersion: '2',
    task: 'Fix payment',
    strategy: 'knowledge-subgraph',
    confidence: {},
    workingSet: {
      core: [{
        nodeId: 'n1',
        relativePath: 'src/payment/PaymentService.ts',
        role: 'target',
        tier: 'core',
        score: 0.95,
        estimatedTokens: 300,
        inclusionReasons: ['seed:exactMatch'],
        provenance: 'explicit-seed',
        relationPaths: ['src/index.ts -> src/payment/PaymentService.ts'],
      }],
      supporting: [{
        nodeId: 'n2',
        relativePath: 'src/payment/PaymentHelper.ts',
        role: 'dependency',
        tier: 'supporting',
        score: 0.8,
        estimatedTokens: 150,
        inclusionReasons: ['graph:calls'],
        provenance: 'graph',
        relationPaths: [],
      }],
      recallReserve: [],
    },
    context: [
      {
        path: 'src/payment/PaymentService.ts',
        role: 'target',
        tier: 'core',
        granularity: 'SYMBOL_RANGE',
        selectedRanges: [{ startLine: 10, endLine: 35 }],
        estimatedTokens: 300,
        score: 0.95,
        reasons: ['seed:exactMatch'],
        provenance: 'explicit-seed',
        relationPaths: ['src/index.ts -> src/payment/PaymentService.ts'],
        content: 'class PaymentService {}',
      },
    ],
    excluded: [],
    metrics: {
      subgraphNodes: 2,
      workingSetEntries: 2,
      contextFiles: 1,
      contextRanges: 1,
      estimatedTokens: 300,
      compressionRatio: 0.5,
      budgetDecision: {
        source: 'adaptive',
        scope: 'narrow',
        budget: { maxFiles: 10, maxEstimatedTokens: 12000, maxNodes: 30, maxBytes: 50000 },
        recallReserveLimit: 2,
        reasons: ['narrow'],
        signals: [],
      },
    },
  };

  it('renders CORE and SUPPORTING tier groups with entries', () => {
    const container = render(<ContextPackWorkingSetView packV2={dummyPack} />);
    expect(container.textContent).toContain('CORE (1)');
    expect(container.textContent).toContain('SUPPORTING (1)');
    expect(container.textContent).toContain('src/payment/PaymentService.ts');
    expect(container.textContent).toContain('src/payment/PaymentHelper.ts');
  });

  it('displays entry detail when selected', () => {
    const container = render(<ContextPackWorkingSetView packV2={dummyPack} />);
    expect(container.textContent).toContain('Why included:');
    expect(container.textContent).toContain('seed:exactMatch');
    expect(container.textContent).toContain('L10-L35');

    const cards = Array.from(container.querySelectorAll('[role="button"]')) as HTMLElement[];
    const helperCard = cards.find((c) => c.textContent?.includes('PaymentHelper.ts'));
    act(() => { helperCard?.click(); });
    expect(container.textContent).toContain('graph:calls');
  });
});

const render = (node: React.ReactNode): HTMLElement => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => { root.render(node); });
  return container;
};

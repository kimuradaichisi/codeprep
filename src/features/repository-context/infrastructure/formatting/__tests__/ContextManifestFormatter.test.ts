import { describe, expect, it } from 'vitest';
import { formatContextManifest } from '../ContextManifestFormatter';
import { createContextManifest } from '../../../domain/ContextManifest';
import { createContextEntry } from '../../../domain/ContextEntry';
import { evaluateBudget } from '../../../domain/ContextBudget';

describe('ContextManifestFormatter', () => {
  it('formats context manifest to markdown correctly', () => {
    const budget = evaluateBudget(98000, 40000);
    const entries = [
      createContextEntry('p1', 'src/order/OrderService.ts', 'target', ['pathAffinity'], [], 100, 'full'),
      createContextEntry(
        'p1',
        'src/order/ReturnPolicy.ts',
        'dependency',
        ['dependency', 'pathAffinity'],
        [],
        45,
        'full'
      ),
      createContextEntry('p1', 'src/order/OrderService.test.ts', 'test', ['pathAffinity'], [], 40, 'full'),
      createContextEntry(
        'p1',
        'docs/order/return.md',
        'specification',
        ['pathAffinity'],
        [{ source: 'docgraph', score: 0.8, detail: '' }],
        35,
        'matchedSnippets'
      ),
      createContextEntry(
        'p1',
        'src/refund/RefundCalculator.ts',
        'supporting',
        ['pathAffinity'],
        [{ source: 'gitCoChange', score: 0.6, detail: '' }],
        30,
        'skeleton'
      ),
    ];

    const manifest = createContextManifest(
      'p1',
      '返品処理を OrderService へ追加する',
      ['src/order/OrderService.ts'],
      entries,
      budget
    );

    const output = formatContextManifest(manifest);

    expect(output).toContain('# Context Manifest');
    expect(output).toContain('## Task\n\n返品処理を OrderService へ追加する');
    expect(output).toContain('## Entry Points\n\n- src/order/OrderService.ts');
    expect(output).toContain('| target | src/order/OrderService.ts | 100 | full | target |');
    expect(output).toContain('| dependency | src/order/ReturnPolicy.ts | 45 | full | dependency, pathAffinity |');
    expect(output).toContain('| test | src/order/OrderService.test.ts | 40 | full | pathAffinity |');
    expect(output).toContain('| specification | docs/order/return.md | 35 | matchedSnippets | pathAffinity, docgraph |');
    expect(output).toContain('| supporting | src/refund/RefundCalculator.ts | 30 | skeleton | pathAffinity, gitCoChange |');
    expect(output).toContain('## Budget\n\n- Bytes: 98000\n- Estimated tokens: 24500\n- Limit: 40000\n- Within limit: yes');
  });

  it('formats evidence section when evidences are present', () => {
    const budget = evaluateBudget(1000, 10000);
    const manifest = createContextManifest(
      'p1',
      'Task with evidence',
      ['src/A.ts'],
      [],
      budget,
      [
        {
          kind: 'dependency',
          projectId: 'p1',
          candidatePath: 'src/A.ts',
          relatedPath: 'src/Policy.ts',
          detail: 'uses Policy',
        },
        {
          kind: 'relatedTest',
          projectId: 'p1',
          candidatePath: 'src/A.ts',
          relatedPath: 'tests/A.test.ts',
          startLine: 15,
          detail: 'tests A',
        },
      ]
    );

    const output = formatContextManifest(manifest);
    expect(output).toContain('## Candidate Evidence');
    expect(output).toContain('### src/A.ts');
    expect(output).toContain('- dependency: src/Policy.ts');
    expect(output).toContain('- relatedTest: tests/A.test.ts:L15');
  });

  it('displays "Within limit: no" when estimated tokens exceed limit', () => {
    const budget = evaluateBudget(100000, 10000); // 25000 tokens > 10000 limit
    const manifest = createContextManifest('p1', 'Over budget', ['src/a.ts'], [], budget);
    const output = formatContextManifest(manifest);
    expect(output).toContain('- Within limit: no');
  });
});

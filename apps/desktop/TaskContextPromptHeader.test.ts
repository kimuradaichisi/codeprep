import { describe, it, expect } from 'vitest';
import { buildTaskContextPromptHeader } from './TaskContextPromptHeader';
import type { ContextEntry } from '../../src/features/repository-context/domain/ContextEntry';

describe('TaskContextPromptHeader', () => {
  it('returns empty string when task is empty', () => {
    expect(buildTaskContextPromptHeader('', 'standard', [])).toBe('');
    expect(buildTaskContextPromptHeader('   ', 'standard', [])).toBe('');
  });

  it('builds structured prompt header with instructions and entry points', () => {
    const entries: ContextEntry[] = [
      {
        projectId: 'p1',
        relativePath: 'src/order/OrderService.ts',
        candidateReasons: ['pathAffinity'],
        recommendationReasons: [],
        score: 95,
        packMode: 'full',
        role: 'target',
      },
      {
        projectId: 'p1',
        relativePath: 'src/order/RefundPolicy.ts',
        candidateReasons: [],
        recommendationReasons: [{ source: 'docgraph', score: 10, detail: 'dep' }],
        score: 80,
        packMode: 'full',
        role: 'dependency',
      },
    ];

    const result = buildTaskContextPromptHeader('Fix duplicate refund bug', 'fast', entries);
    expect(result).toContain('# Task Context: Fix duplicate refund bug');
    expect(result).toContain('## Instructions for LLM');
    expect(result).toContain('- **Strategy**: FAST');
    expect(result).toContain('src/order/OrderService.ts');
    expect(result).toContain('Score: 95');
    expect(result).toContain('src/order/RefundPolicy.ts');
    expect(result).toContain('(dependency)');
    expect(result).toContain('## File Contents');
  });
});

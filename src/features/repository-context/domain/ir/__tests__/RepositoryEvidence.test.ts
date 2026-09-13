import { describe, expect, it } from 'vitest';
import { createEvidence, isValidEvidence } from '../RepositoryEvidence';

describe('RepositoryEvidence', () => {
  it('creates valid deterministic AST evidence', () => {
    const evidence = createEvidence({
      id: 'ev-1',
      category: 'deterministic-ast',
      analyzer: 'typescript-compiler',
      confidence: 1.0,
      sourcePath: 'src/features/selection/foo.ts',
      sourceLocation: { startLine: 12, endLine: 15 },
      details: { astKind: 'CallExpression' },
    });

    expect(evidence.id).toBe('ev-1');
    expect(evidence.category).toBe('deterministic-ast');
    expect(evidence.confidence).toBe(1.0);
    expect(evidence.details?.astKind).toBe('CallExpression');
  });

  it('creates valid rule-derived evidence with derivation provenance', () => {
    const evidence = createEvidence({
      id: 'ev-der-1',
      category: 'rule-derived',
      analyzer: 'rule-dispatch-resolver',
      confidence: 0.95,
      derivation: {
        derivedFromEdgeIds: ['edge-1-calls', 'edge-2-binds-to'],
        ruleName: 'interface-dispatch-resolution',
      },
    });

    expect(evidence.category).toBe('rule-derived');
    expect(evidence.derivation?.derivedFromEdgeIds).toHaveLength(2);
  });

  it('rejects evidence with negative confidence', () => {
    expect(isValidEvidence({
      id: 'ev-bad',
      category: 'heuristic',
      analyzer: 'test-analyzer',
      confidence: -0.5,
    })).toBe(false);
  });
});

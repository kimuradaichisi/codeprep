import { describe, expect, it } from 'vitest';
import { classifyContextRole } from '../ContextRoleClassifier';

describe('ContextRoleClassifier', () => {
  const defaultEntryPoints = ['src/order/OrderService.ts'];

  it('classifies entry point as target', () => {
    const role = classifyContextRole({
      relativePath: 'src/order/OrderService.ts',
      entryPoints: defaultEntryPoints,
    });
    expect(role).toBe('target');
  });

  it('classifies repository rules (AGENTS.md, CLAUDE.md, GEMINI.md)', () => {
    expect(
      classifyContextRole({ relativePath: 'AGENTS.md', entryPoints: defaultEntryPoints })
    ).toBe('repositoryRule');
    expect(
      classifyContextRole({ relativePath: 'docs/CLAUDE.md', entryPoints: defaultEntryPoints })
    ).toBe('repositoryRule');
    expect(
      classifyContextRole({ relativePath: '.agents/GEMINI.md', entryPoints: defaultEntryPoints })
    ).toBe('repositoryRule');
  });

  it('classifies test files', () => {
    expect(
      classifyContextRole({ relativePath: 'src/order/OrderService.test.ts', entryPoints: defaultEntryPoints })
    ).toBe('test');
    expect(
      classifyContextRole({ relativePath: 'src/order/__tests__/OrderService.spec.ts', entryPoints: defaultEntryPoints })
    ).toBe('test');
  });

  it('classifies architecture documents', () => {
    expect(
      classifyContextRole({ relativePath: 'docs/architecture/overview.md', entryPoints: defaultEntryPoints })
    ).toBe('architecture');
    expect(
      classifyContextRole({ relativePath: 'src/architecture.md', entryPoints: defaultEntryPoints })
    ).toBe('architecture');
  });

  it('classifies specification documents', () => {
    expect(
      classifyContextRole({ relativePath: 'docs/order/return.md', entryPoints: defaultEntryPoints })
    ).toBe('specification');
  });

  it('classifies dependency when candidateReasons include dependency', () => {
    const role = classifyContextRole({
      relativePath: 'src/order/ReturnPolicy.ts',
      entryPoints: defaultEntryPoints,
      candidateReasons: ['dependency'],
    });
    expect(role).toBe('dependency');
  });

  it('classifies git or proximity only as supporting', () => {
    const role = classifyContextRole({
      relativePath: 'src/refund/RefundCalculator.ts',
      entryPoints: defaultEntryPoints,
      candidateReasons: ['rgMatch'],
    });
    expect(role).toBe('supporting');
  });

  it('prioritizes target even if path looks like test or rule', () => {
    const role = classifyContextRole({
      relativePath: 'src/order/OrderService.test.ts',
      entryPoints: ['src/order/OrderService.test.ts'],
    });
    expect(role).toBe('target');
  });

  it('prioritizes dependency over supporting when reasons conflict', () => {
    const role = classifyContextRole({
      relativePath: 'src/order/ReturnPolicy.ts',
      entryPoints: defaultEntryPoints,
      candidateReasons: ['dependency', 'rgMatch'],
    });
    expect(role).toBe('dependency');
  });
});

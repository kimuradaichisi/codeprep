// src/features/repository-context/domain/ir/query/__tests__/IdentifierNormalizer.test.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect } from 'vitest';
import { IdentifierNormalizer } from '../IdentifierNormalizer';

describe('IdentifierNormalizer', () => {
  it('splits PascalCase and camelCase into distinct tokens', () => {
    const res = IdentifierNormalizer.normalize('BuildRepositoryIRUseCase');
    expect(res.tokens).toContain('build');
    expect(res.tokens).toContain('repository');
    expect(res.tokens).toContain('ir');
    expect(res.tokens).toContain('use');
    expect(res.tokens).toContain('case');
  });

  it('handles kebab-case, snake_case, and file extensions', () => {
    const res = IdentifierNormalizer.normalize('repository-ir-mapping.ts');
    expect(res.tokens).toContain('repository');
    expect(res.tokens).toContain('ir');
    expect(res.tokens).toContain('mapping');
    expect(res.tokens).toContain('ts');
  });

  it('filters out common stop words', () => {
    const res = IdentifierNormalizer.normalize('既存のRepositoryIndexを実装する');
    expect(res.tokens).toContain('repository');
    expect(res.tokens).toContain('index');
    expect(res.tokens).toContain('既存');
    expect(res.tokens).toContain('実装');
  });
});

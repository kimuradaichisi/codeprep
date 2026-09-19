// src/features/repository-context/domain/workingset/__tests__/RoleAssigner.test.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect } from 'vitest';
import { RoleAssigner } from '../RoleAssigner';

describe('RoleAssigner', () => {
  it('assigns target to seed or top rank', () => {
    expect(RoleAssigner.assignRole({ path: 'src/Service.ts', isSeed: true })).toBe('target');
    expect(RoleAssigner.assignRole({ path: 'src/Service.ts', rank: 1 })).toBe('target');
  });

  it('assigns test to test paths or test kind', () => {
    expect(RoleAssigner.assignRole({ path: 'src/__tests__/Service.test.ts' })).toBe('test');
    expect(RoleAssigner.assignRole({ path: 'src/Service.spec.ts' })).toBe('test');
    expect(RoleAssigner.assignRole({ path: 'src/TestHelper.ts', nodeKind: 'test' })).toBe('test');
  });

  it('assigns architecture or specification to doc paths', () => {
    expect(RoleAssigner.assignRole({ path: 'docs/architecture/overview.md' })).toBe('architecture');
    expect(RoleAssigner.assignRole({ path: 'docs/spec/requirements.md' })).toBe('specification');
    expect(RoleAssigner.assignRole({ path: 'docs/random.md' })).toBe('supporting');
  });

  it('assigns dependency to relations', () => {
    expect(RoleAssigner.assignRole({ path: 'src/Dep.ts', relations: ['DEPENDS_ON'] })).toBe('dependency');
    expect(RoleAssigner.assignRole({ path: 'src/Dep.ts', relations: ['REFERENCES'] })).toBe('dependency');
    expect(RoleAssigner.assignRole({ path: 'src/Dep.ts', relations: ['IMPLEMENTS'] })).toBe('dependency');
  });

  it('defaults to supporting for unknown relations or files', () => {
    expect(RoleAssigner.assignRole({ path: 'src/Other.ts' })).toBe('supporting');
  });
});

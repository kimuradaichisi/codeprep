// src/features/repository-context/domain/workingset/__tests__/GranularityResolver.test.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect } from 'vitest';
import { GranularityResolver } from '../GranularityResolver';

describe('GranularityResolver', () => {
  it('resolves core targets to FULL_FILE or SYMBOL_RANGE', () => {
    expect(
      GranularityResolver.resolve({ role: 'target', tier: 'core', hasSymbolRange: true })
    ).toBe('SYMBOL_RANGE');
    expect(
      GranularityResolver.resolve({ role: 'target', tier: 'core', hasSymbolRange: false })
    ).toBe('FULL_FILE');
  });

  it('resolves supporting roles according to rules', () => {
    expect(
      GranularityResolver.resolve({ role: 'test', tier: 'supporting', hasSymbolRange: false })
    ).toBe('FULL_FILE');
    expect(
      GranularityResolver.resolve({ role: 'architecture', tier: 'supporting', hasDocSection: true })
    ).toBe('DOC_SECTION');
    expect(
      GranularityResolver.resolve({ role: 'supporting', tier: 'supporting' })
    ).toBe('METADATA_ONLY');
  });

  it('resolves recall reserve items safely', () => {
    expect(
      GranularityResolver.resolve({ role: 'dependency', tier: 'recallReserve', hasSymbolRange: false })
    ).toBe('FULL_FILE');
    expect(
      GranularityResolver.resolve({ role: 'specification', tier: 'recallReserve', isDoc: true, hasDocSection: false })
    ).toBe('METADATA_ONLY');
  });
});

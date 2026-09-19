// src/features/repository-context/domain/ir/query/__tests__/QueryMorphology.test.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect } from 'vitest';
import { QueryMorphology } from '../QueryMorphology';

describe('QueryMorphology', () => {
  it('stems mapping, mapper, mappers to map', () => {
    expect(QueryMorphology.stem('mapping')).toBe('map');
    expect(QueryMorphology.stem('mapper')).toBe('map');
    expect(QueryMorphology.stem('mappers')).toBe('map');
    expect(QueryMorphology.isMorphologicallyRelated('mapping', 'mapper')).toBe(true);
  });

  it('stems validation, validator to validat', () => {
    expect(QueryMorphology.stem('validation')).toBe('validat');
    expect(QueryMorphology.stem('validator')).toBe('validat');
    expect(QueryMorphology.isMorphologicallyRelated('validation', 'validate')).toBe(true);
  });

  it('stems analysis, analyzer, analyze', () => {
    expect(QueryMorphology.isMorphologicallyRelated('analysis', 'analyzer')).toBe(true);
    expect(QueryMorphology.isMorphologicallyRelated('analyze', 'analysis')).toBe(true);
  });

  it('stems persistence, persistent', () => {
    expect(QueryMorphology.isMorphologicallyRelated('persistence', 'persistent')).toBe(true);
  });
});

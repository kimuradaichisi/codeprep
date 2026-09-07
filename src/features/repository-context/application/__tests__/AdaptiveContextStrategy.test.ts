// src/features/repository-context/application/__tests__/AdaptiveContextStrategy.test.ts
import { describe, expect, it } from 'vitest';
import { createContextConfidence } from '../../domain/ContextConfidence';
import { createAdaptivePackPolicy, resolveAdaptivePackMode } from '../AdaptiveContextStrategy';

describe('AdaptiveContextStrategy', () => {
  it('maps HIGH confidence to fast pack mode by default', () => {
    const conf = createContextConfidence('high', 85, ['strongExactMatch']);
    expect(resolveAdaptivePackMode(conf)).toBe('fast');
  });

  it('maps MEDIUM confidence to standard pack mode by default', () => {
    const conf = createContextConfidence('medium', 60, ['strongStructuralSupport']);
    expect(resolveAdaptivePackMode(conf)).toBe('standard');
  });

  it('maps LOW confidence to expanded pack mode by default', () => {
    const conf = createContextConfidence('low', 30, ['weakStructuralSupport']);
    expect(resolveAdaptivePackMode(conf)).toBe('expanded');
  });

  it('respects explicit override for fast, standard, and expanded', () => {
    const conf = createContextConfidence('high', 90, ['strongExactMatch']);
    expect(resolveAdaptivePackMode(conf, 'standard')).toBe('standard');
    expect(resolveAdaptivePackMode(conf, 'expanded')).toBe('expanded');
    expect(resolveAdaptivePackMode(conf, 'fast')).toBe('fast');
  });

  it('falls back to confidence-based resolution when override is auto', () => {
    const high = createContextConfidence('high', 90, ['strongExactMatch']);
    const low = createContextConfidence('low', 20, ['weakStructuralSupport']);
    expect(resolveAdaptivePackMode(high, 'auto')).toBe('fast');
    expect(resolveAdaptivePackMode(low, 'auto')).toBe('expanded');
  });

  it('generates correct bounded policy for fast mode (minimized overhead)', () => {
    const policy = createAdaptivePackPolicy('fast');
    expect(policy.mode).toBe('fast');
    expect(policy.maxRelatedTests).toBe(1);
    expect(policy.maxDependencies).toBe(2);
    expect(policy.includeRecommendations).toBe(false);
    expect(policy.includeRepositoryRules).toBe(true);
  });

  it('generates standard policy matching baseline context pack', () => {
    const policy = createAdaptivePackPolicy('standard');
    expect(policy.mode).toBe('standard');
    expect(policy.maxRelatedTests).toBe(3);
    expect(policy.maxDependencies).toBe(5);
    expect(policy.includeRecommendations).toBe(true);
  });

  it('generates expanded policy for low confidence with broader bounded budget', () => {
    const policy = createAdaptivePackPolicy('expanded');
    expect(policy.mode).toBe('expanded');
    expect(policy.maxRelatedTests).toBe(5);
    expect(policy.maxDependencies).toBe(10);
    expect(policy.includeRecommendations).toBe(true);
    expect(policy.includeDocumentation).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { buildSearchPromptHeader } from '../DesktopSearchPromptHeader';

describe('DesktopSearchPromptHeader', () => {
  it('returns empty string when no query or presetKind', () => {
    expect(buildSearchPromptHeader()).toBe('');
  });

  it('builds search prompt header with query and preset', () => {
    const result = buildSearchPromptHeader('OrderService', 'debugFix', 3);
    expect(result).toContain('# CodePrep Repository Context');
    expect(result).toContain('- **Search Query / Focus**: `OrderService`');
    expect(result).toContain('- **Scenario Preset**: debugFix');
    expect(result).toContain('## Instructions for LLM');
    expect(result).toContain('## File Contents');
  });
});

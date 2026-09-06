import { describe, expect, it } from 'vitest';

import type { CandidateReason } from '../CandidateFile';
import { createCandidateFile } from '../CandidateFile';

describe('createCandidateFile', () => {
  it('creates a non-excluded candidate with reasons', () => {
    const file = createCandidateFile('p1', 'src/app.ts', ['rgMatch']);

    expect(file).toMatchObject({
      projectId: 'p1',
      relativePath: 'src/app.ts',
      excluded: false,
    });
    expect(file.reasons).toEqual(['rgMatch']);
  });

  it('marks candidates as excluded when reasons include excluded', () => {
    const file = createCandidateFile('p1', 'src/app.ts', ['excluded']);

    expect(file.excluded).toBe(true);
  });

  it('keeps reasons unchanged when input reasons mutate', () => {
    const reasons: CandidateReason[] = ['rgMatch'];
    const file = createCandidateFile('p1', 'src/app.ts', reasons);

    reasons.push('manualPin');

    expect(file.reasons).toEqual(['rgMatch']);
  });
});
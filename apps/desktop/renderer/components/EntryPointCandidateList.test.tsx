// apps/desktop/renderer/components/EntryPointCandidateList.test.tsx
// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import type { EntryPointCandidate } from '../../../../src/features/repository-context/domain/EntryPointCandidate';
import type { EnrichedEntryPointCandidate } from '../../../../src/features/repository-context/domain/CandidateEvidence';
import { EntryPointCandidateList } from './EntryPointCandidateList';

describe('EntryPointCandidateList', () => {
  const candidate: EntryPointCandidate = {
    projectId: 'p1',
    relativePath: 'src/order/OrderService.ts',
    score: 85,
    reasons: ['semanticMatch'],
    matchedTerms: ['order'],
  };

  const enriched: EnrichedEntryPointCandidate = {
    candidate,
    supportScore: 70,
    evidence: [
      {
        kind: 'dependency',
        projectId: 'p1',
        candidatePath: 'src/order/OrderService.ts',
        relatedPath: 'src/order/ReturnPolicy.ts',
        detail: 'direct import',
      },
    ],
  };

  it('renders support score and structural evidence details', () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    act(() => {
      root.render(
        <EntryPointCandidateList
          candidates={[candidate]}
          enrichedCandidates={[enriched]}
          selectedPaths={[]}
          onToggle={vi.fn()}
        />
      );
    });

    expect(container.textContent).toContain('OrderService.ts');
    expect(container.textContent).toContain('85 pts');
    expect(container.textContent).toContain('Support: 70');
    expect(container.textContent).toContain('Structural Evidence (1)');
    expect(container.textContent).toContain('dependency: src/order/ReturnPolicy.ts');
  });
});

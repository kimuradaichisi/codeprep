// apps/desktop/renderer/components/CandidateCardList.tsx
import React from 'react';
import type { EntryPointCandidate } from '../../../../src/features/repository-context/domain/EntryPointCandidate';
import type { EnrichedEntryPointCandidate } from '../../../../src/features/repository-context/domain/CandidateEvidence';
import { CandidateCardItem } from './CandidateCardItem';

type Props = Readonly<{
  candidates: readonly EntryPointCandidate[];
  enrichedCandidates?: readonly EnrichedEntryPointCandidate[];
  selectedPaths: readonly string[];
  manualInput: string;
  isBusy: boolean;
  onToggle(relativePath: string): void;
  onManualInputChange(value: string): void;
}>;

export const CandidateCardList: React.FC<Props> = ({
  candidates,
  enrichedCandidates,
  selectedPaths,
  manualInput,
  isBusy,
  onToggle,
  onManualInputChange,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const enrichedMap = new Map(enrichedCandidates?.map((e) => [e.candidate.relativePath, e]));

  const handleHeaderKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsExpanded((prev) => !prev);
    }
  };

  return (
    <div className="candidate-card-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={`Candidate entry points (${candidates.length})`}
        onClick={() => setIsExpanded((prev) => !prev)}
        onKeyDown={handleHeaderKeyDown}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 8px',
          background: 'var(--vscode-sideBar-background, #252526)',
          border: '1px solid var(--vscode-widget-border, #333)',
          borderRadius: '4px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)' }}>
            {isExpanded ? '▼' : '▶'}
          </span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--vscode-descriptionForeground)' }}>
            CANDIDATE ENTRY POINTS ({candidates.length})
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: selectedPaths.length > 0 ? '#4ade80' : 'var(--vscode-descriptionForeground)' }}>
            Selected: {selectedPaths.length}
          </span>
          <span style={{ fontSize: '10px', color: '#60a5fa' }}>
            {isExpanded ? '折りたたむ ▲' : '展開 ▼'}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div
          data-testid="candidate-scroll-container"
          style={{
            maxHeight: '220px',
            overflowY: 'auto',
            border: '1px solid var(--vscode-widget-border, #333)',
            borderRadius: '4px',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {candidates.map((c) => (
            <CandidateCardItem
              key={`${c.projectId}:${c.relativePath}`}
              candidate={c}
              enriched={enrichedMap.get(c.relativePath)}
              isSelected={selectedPaths.includes(c.relativePath)}
              onToggle={() => onToggle(c.relativePath)}
            />
          ))}
        </div>
      )}

      <div>
        <label style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground, #888)', display: 'block', marginBottom: '2px' }}>
          Selected / Manual Entry Points (comma separated)
        </label>
        <input
          aria-label="Selected entry points"
          disabled={isBusy}
          value={manualInput}
          placeholder="e.g. src/order/OrderService.ts, src/order/ReturnPolicy.ts"
          onChange={(e) => onManualInputChange(e.target.value)}
          style={{ width: '100%', fontSize: '11px', padding: '4px 6px' }}
        />
      </div>
    </div>
  );
};

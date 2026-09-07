// apps/desktop/renderer/components/CandidateCardList.tsx
import React from 'react';
import type { EntryPointCandidate } from '../../../../src/features/repository-context/domain/EntryPointCandidate';
import type { EnrichedEntryPointCandidate } from '../../../../src/features/repository-context/domain/CandidateEvidence';

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
  const enrichedMap = new Map(enrichedCandidates?.map((e) => [e.candidate.relativePath, e]));

  return (
    <div className="candidate-card-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--vscode-descriptionForeground)' }}>
          CANDIDATE ENTRY POINTS ({candidates.length})
        </span>
        <span style={{ fontSize: '10px', color: selectedPaths.length > 0 ? '#4ade80' : 'var(--vscode-descriptionForeground)' }}>
          Selected: {selectedPaths.length}
        </span>
      </div>

      <div
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

const CandidateCardItem: React.FC<{
  candidate: EntryPointCandidate;
  enriched?: EnrichedEntryPointCandidate;
  isSelected: boolean;
  onToggle(): void;
}> = ({ candidate, enriched, isSelected, onToggle }) => (
  <div
    onClick={onToggle}
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '8px',
      padding: '6px 8px',
      cursor: 'pointer',
      fontSize: '11px',
      borderRadius: '3px',
      border: isSelected ? '1px solid #3b82f6' : '1px solid transparent',
      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--vscode-editor-background, #1e1e1e)',
    }}
  >
    <input
      type="checkbox"
      checked={isSelected}
      onChange={onToggle}
      onClick={(e) => e.stopPropagation()}
      style={{ marginTop: '2px' }}
    />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {candidate.relativePath.split('/').pop()}
        </span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', opacity: 0.85 }}>Discovery {candidate.score}</span>
          <span style={{ fontSize: '10px', color: enriched && enriched.supportScore > 0 ? '#4ade80' : 'var(--vscode-descriptionForeground)' }}>
            Support {enriched?.supportScore ?? 0}
          </span>
        </div>
      </div>
      <div style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {candidate.relativePath}
      </div>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
        {candidate.reasons.map((r) => (
          <span key={r} style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '2px', backgroundColor: 'var(--vscode-badge-background, #333)', color: 'var(--vscode-badge-foreground, #eee)' }}>
            {r}
          </span>
        ))}
      </div>
      {enriched && enriched.evidence.length > 0 && (
        <details onClick={(e) => e.stopPropagation()} style={{ marginTop: '4px', fontSize: '10px', opacity: 0.9 }}>
          <summary style={{ cursor: 'pointer', color: 'var(--vscode-textLink-foreground, #60a5fa)' }}>
            Structural Evidence ({enriched.evidence.length})
          </summary>
          <ul style={{ margin: '2px 0 0 12px', padding: 0 }}>
            {enriched.evidence.map((ev, idx) => (
              <li key={`${ev.kind}:${idx}`}>{ev.kind}: {ev.relatedPath ?? ev.relatedSymbol}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  </div>
);

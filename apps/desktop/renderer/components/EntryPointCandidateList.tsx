// apps/desktop/renderer/components/EntryPointCandidateList.tsx
import React from 'react';
import type { EntryPointCandidate } from '../../../../src/features/repository-context/domain/EntryPointCandidate';
import type { EnrichedEntryPointCandidate } from '../../../../src/features/repository-context/domain/CandidateEvidence';

type Props = Readonly<{
  candidates: readonly EntryPointCandidate[];
  enrichedCandidates?: readonly EnrichedEntryPointCandidate[];
  selectedPaths: readonly string[];
  onToggle(relativePath: string): void;
}>;

export const EntryPointCandidateList: React.FC<Props> = ({
  candidates,
  enrichedCandidates,
  selectedPaths,
  onToggle,
}) => {
  if (candidates.length === 0) return null;
  const enrichedMap = new Map(enrichedCandidates?.map((e) => [e.candidate.relativePath, e]));

  return (
    <div className="entry-point-candidates-section" style={{ marginTop: '12px' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--vscode-descriptionForeground)', marginBottom: '6px' }}>
        ENTRY POINT CANDIDATES ({candidates.length})
      </div>
      <div
        className="candidates-list-scroll"
        style={{
          maxHeight: '180px',
          overflowY: 'auto',
          border: '1px solid var(--vscode-widget-border, #333)',
          borderRadius: '4px',
          padding: '4px',
        }}
      >
        {candidates.map((candidate) => (
          <CandidateRow
            key={`${candidate.projectId}:${candidate.relativePath}`}
            candidate={candidate}
            enriched={enrichedMap.get(candidate.relativePath)}
            isSelected={selectedPaths.includes(candidate.relativePath)}
            onToggle={() => onToggle(candidate.relativePath)}
          />
        ))}
      </div>
    </div>
  );
};

type RowProps = Readonly<{
  candidate: EntryPointCandidate;
  enriched?: EnrichedEntryPointCandidate;
  isSelected: boolean;
  onToggle(): void;
}>;

const CandidateRow: React.FC<RowProps> = ({ candidate, enriched, isSelected, onToggle }) => (
  <div
    onClick={onToggle}
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '8px',
      padding: '4px 6px',
      cursor: 'pointer',
      fontSize: '12px',
      borderRadius: '3px',
      backgroundColor: isSelected ? 'var(--vscode-list-activeSelectionBackground, #2a2d2e)' : 'transparent',
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
        <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {candidate.relativePath.split('/').pop()}
        </span>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', opacity: 0.8, fontWeight: 'bold' }}>{candidate.score} pts</span>
          {enriched && enriched.supportScore > 0 && (
            <span style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '2px', backgroundColor: '#2d5a27', color: '#a6e3a1', fontWeight: 600 }}>
              Support: {enriched.supportScore}
            </span>
          )}
        </div>
      </div>
      <div style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {candidate.relativePath}
      </div>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
        {candidate.reasons.map((reason) => (
          <span key={reason} style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '2px', backgroundColor: 'var(--vscode-badge-background, #444)', color: 'var(--vscode-badge-foreground, #fff)' }}>
            {reason}
          </span>
        ))}
      </div>
      {enriched && enriched.evidence.length > 0 && (
        <details onClick={(e) => e.stopPropagation()} style={{ marginTop: '4px', fontSize: '10px', opacity: 0.85 }}>
          <summary style={{ cursor: 'pointer' }}>Structural Evidence ({enriched.evidence.length})</summary>
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

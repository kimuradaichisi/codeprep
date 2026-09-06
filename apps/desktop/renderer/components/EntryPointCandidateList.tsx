// apps/desktop/renderer/components/EntryPointCandidateList.tsx
import React from 'react';
import type { EntryPointCandidate } from '../../../../src/features/repository-context/domain/EntryPointCandidate';

type Props = Readonly<{
  candidates: readonly EntryPointCandidate[];
  selectedPaths: readonly string[];
  onToggle(relativePath: string): void;
}>;

export const EntryPointCandidateList: React.FC<Props> = ({
  candidates,
  selectedPaths,
  onToggle,
}) => {
  if (candidates.length === 0) return null;

  return (
    <div className="entry-point-candidates-section" style={{ marginTop: '12px' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--vscode-descriptionForeground)', marginBottom: '6px' }}>
        ENTRY POINT CANDIDATES ({candidates.length})
      </div>
      <div
        className="candidates-list-scroll"
        style={{
          maxHeight: '160px',
          overflowY: 'auto',
          border: '1px solid var(--vscode-widget-border, #333)',
          borderRadius: '4px',
          padding: '4px',
        }}
      >
        {candidates.map((candidate) => {
          const isSelected = selectedPaths.includes(candidate.relativePath);
          return (
            <CandidateRow
              key={`${candidate.projectId}:${candidate.relativePath}`}
              candidate={candidate}
              isSelected={isSelected}
              onToggle={() => onToggle(candidate.relativePath)}
            />
          );
        })}
      </div>
    </div>
  );
};

type RowProps = Readonly<{
  candidate: EntryPointCandidate;
  isSelected: boolean;
  onToggle(): void;
}>;

const CandidateRow: React.FC<RowProps> = ({ candidate, isSelected, onToggle }) => (
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
        <span style={{ fontSize: '10px', opacity: 0.8, fontWeight: 'bold' }}>{candidate.score} pts</span>
      </div>
      <div style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {candidate.relativePath}
      </div>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
        {candidate.reasons.map((reason) => (
          <span
            key={reason}
            style={{
              fontSize: '9px',
              padding: '1px 4px',
              borderRadius: '2px',
              backgroundColor: 'var(--vscode-badge-background, #444)',
              color: 'var(--vscode-badge-foreground, #fff)',
            }}
          >
            {reason}
          </span>
        ))}
      </div>
    </div>
  </div>
);

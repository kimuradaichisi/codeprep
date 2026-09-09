// apps/desktop/renderer/components/CandidateCardItem.tsx
import React from 'react';
import type { EntryPointCandidate } from '../../../../src/features/repository-context/domain/EntryPointCandidate';
import type { EnrichedEntryPointCandidate } from '../../../../src/features/repository-context/domain/CandidateEvidence';

type Props = Readonly<{
  candidate: EntryPointCandidate;
  enriched?: EnrichedEntryPointCandidate;
  isSelected: boolean;
  onToggle(): void;
}>;

export const CandidateCardItem: React.FC<Props> = ({
  candidate,
  enriched,
  isSelected,
  onToggle,
}) => {
  const fileName = candidate.relativePath.split('/').pop() ?? candidate.relativePath;
  const supportScore = enriched?.supportScore ?? 0;
  const supportColor = supportScore > 0 ? '#4ade80' : 'var(--vscode-descriptionForeground)';

  return (
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
        style={{ marginTop: '2px', width: '14px', height: '14px', flexShrink: 0, cursor: 'pointer' }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fileName}
          </span>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', opacity: 0.85 }}>Discovery {candidate.score}</span>
            <span style={{ fontSize: '10px', color: supportColor }}>
              Support {supportScore}
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
};

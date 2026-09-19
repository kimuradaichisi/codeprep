// apps/desktop/renderer/components/ContextPackWorkingSetView.tsx
/*
 * Copyright 2026 CodePrep Contributors
 */
import React, { useState } from 'react';
import type {
  ContextPackV2,
  ContextPackV2Entry,
  WorkingSetEntry,
} from '../../../../src/features/repository-context/domain/workingset';

type Props = Readonly<{
  packV2: ContextPackV2;
}>;

export const ContextPackWorkingSetView: React.FC<Props> = ({ packV2 }) => {
  const [selectedPath, setSelectedPath] = useState<string | undefined>(
    packV2.context[0]?.path
  );

  const contextMap = new Map<string, ContextPackV2Entry>(
    packV2.context.map((e) => [e.path, e])
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
      <TierGroup
        title="CORE"
        color="#4ade80"
        entries={packV2.workingSet.core}
        contextMap={contextMap}
        selectedPath={selectedPath}
        onSelect={setSelectedPath}
      />
      <TierGroup
        title="SUPPORTING"
        color="#60a5fa"
        entries={packV2.workingSet.supporting}
        contextMap={contextMap}
        selectedPath={selectedPath}
        onSelect={setSelectedPath}
      />
      <TierGroup
        title="RECALL RESERVE"
        color="#facc15"
        entries={packV2.workingSet.recallReserve}
        contextMap={contextMap}
        selectedPath={selectedPath}
        onSelect={setSelectedPath}
      />
    </div>
  );
};

const TierGroup: React.FC<{
  title: string;
  color: string;
  entries: readonly WorkingSetEntry[];
  contextMap: Map<string, ContextPackV2Entry>;
  selectedPath?: string;
  onSelect(path: string): void;
}> = ({ title, color, entries, contextMap, selectedPath, onSelect }) => {
  if (entries.length === 0) return null;

  return (
    <div style={{ border: '1px solid #2d3748', borderRadius: '4px', padding: '6px', background: '#111827' }}>
      <div style={{ fontWeight: 'bold', color, marginBottom: '4px', fontSize: '10px' }}>
        {title} ({entries.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {entries.map((entry) => (
          <WorkingSetEntryCard
            key={entry.relativePath}
            entry={entry}
            detail={contextMap.get(entry.relativePath)}
            isSelected={selectedPath === entry.relativePath}
            onSelect={() => onSelect(entry.relativePath)}
          />
        ))}
      </div>
    </div>
  );
};

const WorkingSetEntryCard: React.FC<{
  entry: WorkingSetEntry;
  detail?: ContextPackV2Entry;
  isSelected: boolean;
  onSelect(): void;
}> = ({ entry, detail, isSelected, onSelect }) => {
  const granularity = detail?.granularity ?? 'FULL_FILE';
  const tokens = detail?.estimatedTokens ?? 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
      style={{
        padding: '5px 8px',
        borderRadius: '3px',
        cursor: 'pointer',
        background: isSelected ? '#1e293b' : '#18202f',
        border: `1px solid ${isSelected ? '#38bdf8' : '#223049'}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold', color: '#f1f5f9' }}>{entry.relativePath}</span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '10px' }}>
          <span style={{ background: '#334155', padding: '1px 4px', borderRadius: '2px' }}>{entry.role}</span>
          <span style={{ background: '#1e3a5f', color: '#93c5fd', padding: '1px 4px', borderRadius: '2px' }}>
            {granularity}
          </span>
          <span style={{ color: '#94a3b8' }}>{tokens} tok</span>
        </div>
      </div>
      {isSelected && (
        <EntryDetailContent entry={entry} detail={detail} />
      )}
    </div>
  );
};

const EntryDetailContent: React.FC<{
  entry: WorkingSetEntry;
  detail?: ContextPackV2Entry;
}> = ({ entry, detail }) => {
  const ranges = detail?.selectedRanges?.length
    ? detail.selectedRanges.map((r) => `L${r.startLine}-L${r.endLine}`).join(', ')
    : 'Full File';

  return (
    <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #334155', fontSize: '10px', color: '#cbd5e1' }}>
      <div><strong>Score:</strong> {entry.score.toFixed(2)} | <strong>Provenance:</strong> {entry.provenance}</div>
      <div><strong>Selected Range:</strong> {ranges}</div>
      <div style={{ marginTop: '3px' }}><strong>Why included:</strong></div>
      <ul style={{ margin: '2px 0 0 16px', padding: 0 }}>
        {entry.inclusionReasons.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
      {entry.relationPaths.length > 0 && (
        <div style={{ marginTop: '3px' }}>
          <strong>Relation paths:</strong> {entry.relationPaths.join(' -> ')}
        </div>
      )}
    </div>
  );
};

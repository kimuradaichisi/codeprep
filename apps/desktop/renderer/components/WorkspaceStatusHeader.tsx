// apps/desktop/renderer/components/WorkspaceStatusHeader.tsx
import React from 'react';

type Props = Readonly<{
  indexStatus?: string;
  knowledgeStatus?: string;
  semanticStatus?: string;
}>;

export const WorkspaceStatusHeader: React.FC<Props> = ({
  indexStatus = 'ready',
  knowledgeStatus = 'ready',
  semanticStatus = 'ready',
}) => {
  const isSemanticDegraded = semanticStatus.toLowerCase() === 'degraded' || semanticStatus.toLowerCase() === 'not_built';

  return (
    <div
      className="workspace-status-header"
      style={{
        padding: '6px 8px',
        backgroundColor: 'var(--vscode-editor-background, #1e1e1e)',
        border: '1px solid var(--vscode-widget-border, #333)',
        borderRadius: '4px',
        fontSize: '11px',
      }}
    >
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <StatusPill label="Repository Index" status={indexStatus} />
        <StatusPill label="Knowledge Index" status={knowledgeStatus} />
        <StatusPill label="Semantic Index" status={semanticStatus} isDegraded={isSemanticDegraded} />
      </div>
      {isSemanticDegraded && (
        <div
          style={{
            marginTop: '6px',
            color: '#fb923c',
            fontSize: '10px',
            lineHeight: 1.3,
          }}
        >
          Semantic search is unavailable. Deterministic discovery and structural evidence remain available.
        </div>
      )}
    </div>
  );
};

const StatusPill: React.FC<{ label: string; status: string; isDegraded?: boolean }> = ({
  label,
  status,
  isDegraded,
}) => {
  const color = isDegraded ? '#fb923c' : status.toLowerCase() === 'ready' ? '#4ade80' : '#9eafc8';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ color: 'var(--vscode-descriptionForeground, #888)' }}>{label}:</span>
      <span style={{ fontWeight: 600, color }}>{status.toUpperCase()}</span>
    </div>
  );
};

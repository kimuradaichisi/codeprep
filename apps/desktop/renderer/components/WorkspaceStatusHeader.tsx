// apps/desktop/renderer/components/WorkspaceStatusHeader.tsx
import React from 'react';

type Props = Readonly<{
  indexStatus?: string;
  knowledgeStatus?: string;
  semanticStatus?: string;
  onRefreshIndex?(): void;
  onOpenSettings?(): void;
}>;

export const WorkspaceStatusHeader: React.FC<Props> = ({
  indexStatus = 'ready',
  knowledgeStatus = 'ready',
  semanticStatus = 'ready',
  onRefreshIndex,
  onOpenSettings,
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <StatusPill label="Repository Index" status={indexStatus} />
          <StatusPill label="Knowledge Index" status={knowledgeStatus} />
          <StatusPill label="Semantic Index" status={semanticStatus} isDegraded={isSemanticDegraded} />
        </div>
        {onRefreshIndex && (
          <button
            onClick={onRefreshIndex}
            style={{ fontSize: '10px', padding: '2px 8px', height: '22px' }}
            title="Sync all indexes including semantic embeddings"
          >
            Sync / Refresh
          </button>
        )}
      </div>
      {isSemanticDegraded && (
        <div
          style={{
            marginTop: '6px',
            color: '#fb923c',
            fontSize: '10px',
            lineHeight: 1.3,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>Semantic search is unavailable. Deterministic discovery and structural evidence remain available.</span>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              style={{ fontSize: '10px', padding: '1px 6px', background: 'transparent', border: '1px solid #fb923c', color: '#fb923c', cursor: 'pointer', borderRadius: '3px' }}
            >
              ⚙ Setup Ollama
            </button>
          )}
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

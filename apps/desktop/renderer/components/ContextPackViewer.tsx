// apps/desktop/renderer/components/ContextPackViewer.tsx
/*
 * Copyright 2026 CodePrep Contributors
 */
import React from 'react';
import type { ContextManifest } from '../../../../src/features/repository-context/domain/ContextManifest';
import type { AdaptivePackMode } from '../../../../src/features/repository-context/domain/ContextConfidence';
import type { ContextPackV2 } from '../../../../src/features/repository-context/domain/workingset';
import type { DesktopPreviewTab } from '../types';
import { ContextPackWorkingSetView } from './ContextPackWorkingSetView';

type Props = Readonly<{
  manifest?: ContextManifest;
  contextPackV2?: ContextPackV2;
  manifestMarkdown?: string;
  packContent?: string;
  resolvedStrategy?: AdaptivePackMode | 'knowledge';
  activeTab: DesktopPreviewTab;
  isBusy: boolean;
  onTabChange(tab: DesktopPreviewTab): void;
  onCopy(format?: 'content' | 'markdown' | 'json'): void;
  onReset(): void;
}>;

export const ContextPackViewer: React.FC<Props> = ({
  manifest,
  contextPackV2,
  manifestMarkdown = '',
  packContent = '',
  resolvedStrategy = 'standard',
  activeTab,
  isBusy,
  onTabChange,
  onCopy,
  onReset,
}) => {
  if (!manifest && !contextPackV2) return null;

  return (
    <div
      className="context-pack-viewer"
      style={{
        border: '1px solid var(--vscode-widget-border, #333)',
        borderRadius: '4px',
        padding: '8px',
        backgroundColor: 'var(--vscode-editor-background, #1e1e1e)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <ViewerHeader
        manifest={manifest}
        packV2={contextPackV2}
        strategy={resolvedStrategy}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />
      {contextPackV2 ? (
        <V2MetricsBar packV2={contextPackV2} />
      ) : (
        <V1RolesBar manifest={manifest} />
      )}
      <ViewerContentArea
        activeTab={activeTab}
        packV2={contextPackV2}
        manifestMarkdown={manifestMarkdown}
        packContent={packContent}
        manifest={manifest}
      />
      <ViewerActionsBar
        isBusy={isBusy}
        hasV2={Boolean(contextPackV2)}
        onCopy={onCopy}
        onReset={onReset}
      />
    </div>
  );
};

const ViewerHeader: React.FC<{
  manifest?: ContextManifest;
  packV2?: ContextPackV2;
  strategy: AdaptivePackMode | 'knowledge';
  activeTab: DesktopPreviewTab;
  onTabChange(tab: DesktopPreviewTab): void;
}> = ({ manifest, packV2, strategy, activeTab, onTabChange }) => {
  const fileCount = packV2 ? packV2.metrics.contextFiles : manifest?.entries.length ?? 0;
  const tokenCount = packV2 ? packV2.metrics.estimatedTokens : manifest?.budget.estimatedTokens ?? 0;

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
        <span style={{ fontWeight: 600, color: '#4ade80' }}>
          Strategy: {strategy.toUpperCase()}
        </span>
        <span>Files: {fileCount}</span>
        <span>Estimated Tokens: {tokenCount.toLocaleString()}</span>
      </div>

      <div style={{ display: 'flex', gap: '4px' }}>
        <TabButton id="manifest" label="Markdown" current={activeTab} onSelect={onTabChange} />
        {packV2 && <TabButton id="workingset" label="Working Set" current={activeTab} onSelect={onTabChange} />}
        <TabButton id="context" label="Code" current={activeTab} onSelect={onTabChange} />
        <TabButton id="json" label="JSON" current={activeTab} onSelect={onTabChange} />
      </div>
    </div>
  );
};

const TabButton: React.FC<{
  id: DesktopPreviewTab;
  label: string;
  current: DesktopPreviewTab;
  onSelect(tab: DesktopPreviewTab): void;
}> = ({ id, label, current, onSelect }) => (
  <button
    type="button"
    className={current === id ? 'primary-button' : ''}
    style={{ fontSize: '10px', padding: '2px 6px' }}
    onClick={() => onSelect(id)}
  >
    {label}
  </button>
);

const V2MetricsBar: React.FC<{ packV2: ContextPackV2 }> = ({ packV2 }) => {
  const m = packV2.metrics;
  const bd = m.budgetDecision;
  const comp = (m.compressionRatio * 100).toFixed(1);

  return (
    <div style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <span>Scope: <strong>{bd.scope}</strong></span>
      <span>Budget: <strong>{bd.source}</strong> (max: {bd.budget.maxEstimatedTokens})</span>
      <span>Compression: <strong>{comp}%</strong></span>
      <span>Ranges: <strong>{m.contextRanges}</strong></span>
    </div>
  );
};

const V1RolesBar: React.FC<{ manifest?: ContextManifest }> = ({ manifest }) => {
  if (!manifest) return null;
  const roleCounts = extractRoleCounts(manifest);
  return (
    <div style={{ fontSize: '10px', color: '#888', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      <span>Roles:</span>
      {roleCounts.map(([role, count]) => (
        <span key={role} style={{ background: '#222', padding: '1px 4px', borderRadius: '2px' }}>
          {role}: {count}
        </span>
      ))}
    </div>
  );
};

const ViewerContentArea: React.FC<{
  activeTab: DesktopPreviewTab;
  packV2?: ContextPackV2;
  manifestMarkdown: string;
  packContent: string;
  manifest?: ContextManifest;
}> = ({ activeTab, packV2, manifestMarkdown, packContent, manifest }) => {
  if (activeTab === 'workingset' && packV2) {
    return (
      <div style={{ minHeight: '180px', maxHeight: '380px', overflowY: 'auto' }}>
        <ContextPackWorkingSetView packV2={packV2} />
      </div>
    );
  }

  const displayText = resolveDisplayText(activeTab, packV2, manifestMarkdown, packContent, manifest);
  return (
    <pre
      tabIndex={0}
      aria-label="Context Pack Preview"
      style={{
        margin: 0,
        minHeight: '180px',
        maxHeight: '380px',
        overflowY: 'auto',
        fontSize: '11px',
        fontFamily: 'monospace',
        backgroundColor: '#181818',
        border: '1px solid #282828',
        padding: '6px',
        borderRadius: '3px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {displayText || 'No content generated.'}
    </pre>
  );
};

function resolveDisplayText(
  tab: DesktopPreviewTab,
  packV2?: ContextPackV2,
  markdown = '',
  content = '',
  manifest?: ContextManifest
): string {
  if (tab === 'json') {
    return JSON.stringify(packV2 ?? manifest, null, 2);
  }
  if (tab === 'context') {
    return content;
  }
  return markdown;
}

const ViewerActionsBar: React.FC<{
  isBusy: boolean;
  hasV2: boolean;
  onCopy(format?: 'content' | 'markdown' | 'json'): void;
  onReset(): void;
}> = ({ isBusy, hasV2, onCopy, onReset }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap', gap: '6px' }}>
    <div style={{ display: 'flex', gap: '6px' }}>
      <button
        className="primary-button"
        disabled={isBusy}
        onClick={() => onCopy('content')}
        style={{ fontSize: '11px', padding: '3px 10px' }}
      >
        📋 Copy {hasV2 ? 'Pack v2' : 'Context Pack'}
      </button>
      <button
        disabled={isBusy}
        onClick={() => onCopy('markdown')}
        style={{ fontSize: '10px', padding: '2px 8px' }}
      >
        Copy Markdown
      </button>
      <button
        disabled={isBusy}
        onClick={() => onCopy('json')}
        style={{ fontSize: '10px', padding: '2px 8px' }}
      >
        Copy JSON
      </button>
    </div>
    <button
      disabled={isBusy}
      onClick={onReset}
      style={{ fontSize: '10px', padding: '2px 8px', color: '#9eafc8' }}
    >
      New Task / Reset
    </button>
  </div>
);

const extractRoleCounts = (manifest: ContextManifest): [string, number][] => {
  const map = new Map<string, number>();
  for (const e of manifest.entries) {
    const role = e.role.toUpperCase();
    map.set(role, (map.get(role) ?? 0) + 1);
  }
  return Array.from(map.entries());
};

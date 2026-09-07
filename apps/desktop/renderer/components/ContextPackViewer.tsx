// apps/desktop/renderer/components/ContextPackViewer.tsx
import React from 'react';
import type { ContextManifest } from '../../../../src/features/repository-context/domain/ContextManifest';
import type { AdaptivePackMode } from '../../../../src/features/repository-context/domain/ContextConfidence';

type Props = Readonly<{
  manifest?: ContextManifest;
  manifestMarkdown?: string;
  packContent?: string;
  resolvedStrategy?: AdaptivePackMode;
  activeTab: 'manifest' | 'context';
  isBusy: boolean;
  onTabChange(tab: 'manifest' | 'context'): void;
  onCopy(): void;
  onReset(): void;
}>;

export const ContextPackViewer: React.FC<Props> = ({
  manifest,
  manifestMarkdown = '',
  packContent = '',
  resolvedStrategy = 'standard',
  activeTab,
  isBusy,
  onTabChange,
  onCopy,
  onReset,
}) => {
  if (!manifest) return null;
  const roleCounts = extractRoleCounts(manifest);
  const displayText = activeTab === 'manifest' ? manifestMarkdown : packContent;

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
          <span style={{ fontWeight: 600, color: '#4ade80' }}>
            Strategy: {resolvedStrategy.toUpperCase()}
          </span>
          <span>Files: {manifest.entries.length}</span>
          <span>Estimated Tokens: {manifest.budget.estimatedTokens.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              className={activeTab === 'manifest' ? 'primary-button' : ''}
              style={{ fontSize: '10px', padding: '2px 6px' }}
              onClick={() => onTabChange('manifest')}
            >
              Manifest
            </button>
            <button
              type="button"
              className={activeTab === 'context' ? 'primary-button' : ''}
              style={{ fontSize: '10px', padding: '2px 6px' }}
              onClick={() => onTabChange('context')}
            >
              Context
            </button>
          </div>
          <button
            type="button"
            className="primary-button"
            disabled={isBusy}
            onClick={onCopy}
            style={{ fontSize: '10px', padding: '2px 8px' }}
            title="Copy pack content to clipboard"
          >
            📋 Copy
          </button>
        </div>
      </div>

      <div style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground, #888)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <span>Roles:</span>
        {roleCounts.map(([role, count]) => (
          <span key={role} style={{ background: '#222', padding: '1px 4px', borderRadius: '2px' }}>
            {role}: {count}
          </span>
        ))}
      </div>

      <pre
        tabIndex={0}
        aria-label="Context Pack Preview"
        style={{
          margin: 0,
          minHeight: '180px',
          maxHeight: '380px',
          overflowY: 'auto',
          fontSize: '11px',
          fontFamily: 'var(--vscode-editor-font-family, monospace)',
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
        <button
          className="primary-button"
          disabled={isBusy || !packContent}
          onClick={onCopy}
          style={{ fontSize: '11px', padding: '3px 10px' }}
        >
          Copy Context Pack
        </button>
        <button
          disabled={isBusy}
          onClick={onReset}
          style={{ fontSize: '10px', padding: '2px 8px', color: '#9eafc8' }}
        >
          New Task / Reset
        </button>
      </div>
    </div>
  );
};

const extractRoleCounts = (manifest: ContextManifest): [string, number][] => {
  const map = new Map<string, number>();
  for (const e of manifest.entries) {
    const role = e.role.toUpperCase();
    map.set(role, (map.get(role) ?? 0) + 1);
  }
  return Array.from(map.entries());
};

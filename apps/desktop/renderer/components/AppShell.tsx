import React, { useEffect, useState } from 'react';
import type { AppShellProps } from '../types';
import { version } from '../../../../package.json';

export const AppShell = ({
  projects, search, tree, output, isProjectsOpen, toggleProjects, openSettings, openHelp,
}: AppShellProps) => {
  const [isOutputOpen, setIsOutputOpen] = useState(true);

  useEffect(() => {
    document.title = `CodePrep Desktop v${version}`;
  }, []);

  return (
    <main className="desktop-workspace">
      <header className="workspace-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
            CODEPREP DESKTOP
            <span style={{ fontSize: '10px', background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>
              v{version}
            </span>
          </p>
          <h1 style={{ margin: '2px 0 0' }}>Context workspace</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setIsOutputOpen(!isOutputOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '5px 10px' }}
            title={isOutputOpen ? 'Collapse Output Panel' : 'Expand Output Panel'}
            aria-label="Toggle Output Panel"
          >
            <span>{isOutputOpen ? '▶' : '◀'}</span> {isOutputOpen ? 'Hide Output' : 'Show Output'}
          </button>
          {openHelp && (
            <button
              onClick={openHelp}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', padding: '5px 10px' }}
              title="Help & Guide"
              aria-label="Open Help"
            >
              <span>❓</span> Help
            </button>
          )}
          {openSettings && (
            <button
              onClick={openSettings}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '5px 12px' }}
              title="Open Settings"
              aria-label="Open Settings"
            >
              <span>⚙</span> Settings
            </button>
          )}
        </div>
      </header>
    <div className="workspace-grid" style={{ display: 'flex', gap: '14px', height: 'calc(100vh - 120px)', maxHeight: 'calc(100vh - 120px)' }}>
      <div className="vertical-toolbar" style={{ display: 'flex', flexDirection: 'column' }}>
        <button
          className={`toolbar-btn ${isProjectsOpen ? 'active' : ''}`}
          onClick={toggleProjects}
          title="Toggle Projects"
          aria-label="Toggle Projects Sidebar"
        >
          <FolderIcon />
        </button>
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {openHelp && (
            <button
              className="toolbar-btn"
              onClick={openHelp}
              title="Help"
              aria-label="Open Help Sidebar Button"
              style={{ fontSize: '15px' }}
            >
              ❓
            </button>
          )}
          {openSettings && (
            <button
              className="toolbar-btn"
              onClick={openSettings}
              title="Settings"
              aria-label="Open Settings Sidebar Button"
              style={{ fontSize: '16px' }}
            >
              ⚙
            </button>
          )}
        </div>
      </div>
      <div className={`projects-drawer ${isProjectsOpen ? 'open' : 'closed'}`}>
        {projects}
      </div>
      <div className="workspace-pane left-pane" style={{ flex: isOutputOpen ? 1.6 : 1, minWidth: 0, gap: '12px' }}>
        <div className="search-section">{search}</div>
        <div className="tree-section" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>{tree}</div>
      </div>
      {isOutputOpen && (
        <aside className="workspace-pane output-pane" style={{ flex: 1, minWidth: 0 }}>
          {output}
        </aside>
      )}
    </div>
  </main>
  );
};

const FolderIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

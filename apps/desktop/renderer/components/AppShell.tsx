import type { ReactNode } from 'react';

import type { AppShellProps } from '../types';

export const AppShell = ({ projects, search, tree, output, isProjectsOpen, toggleProjects }: AppShellProps) => (
  <main className="desktop-workspace">
    <header className="workspace-header"><p className="eyebrow">CODEPREP DESKTOP</p><h1>Context workspace</h1></header>
    <div className="workspace-grid" style={{ display: 'flex', gap: '14px', height: 'calc(100vh - 120px)', maxHeight: 'calc(100vh - 120px)' }}>
      <div className="vertical-toolbar">
        <button
          className={`toolbar-btn ${isProjectsOpen ? 'active' : ''}`}
          onClick={toggleProjects}
          title="Toggle Projects"
          aria-label="Toggle Projects Sidebar"
        >
          <FolderIcon />
        </button>
      </div>
      <div className={`projects-drawer ${isProjectsOpen ? 'open' : 'closed'}`}>
        {projects}
      </div>
      <div className="workspace-pane left-pane" style={{ flex: 1.6, minWidth: 0, gap: '12px' }}>
        <div className="search-section">{search}</div>
        <div className="tree-section" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>{tree}</div>
      </div>
      <aside className="workspace-pane output-pane" style={{ flex: 1, minWidth: 0 }}>
        {output}
      </aside>
    </div>
  </main>
);

const FolderIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

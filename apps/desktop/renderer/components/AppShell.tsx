import type { ReactNode } from 'react';

export const AppShell = ({ projects, search, tree, output }: Readonly<{
  projects: ReactNode; search: ReactNode; tree: ReactNode; output: ReactNode;
}>) => <main className="desktop-workspace">
  <header className="workspace-header"><p className="eyebrow">CODEPREP DESKTOP</p><h1>Context workspace</h1></header>
  <div className="workspace-grid">
    <div className="workspace-pane left-pane" aria-label="Workspace">
      <div className="left-pane-header-row">
        <div className="project-section">{projects}</div>
        <div className="search-section">{search}</div>
      </div>
      <div className="tree-section">{tree}</div>
    </div>
    <aside className="workspace-pane output-pane" aria-label="Output">{output}</aside>
  </div>
</main>;

import type { ReactNode } from 'react';

export const AppShell = ({ projects, explorer, output }: Readonly<{
  projects: ReactNode; explorer: ReactNode; output: ReactNode;
}>) => <main className="desktop-workspace">
  <header className="workspace-header"><p className="eyebrow">CODEPREP DESKTOP</p><h1>Context workspace</h1></header>
  <div className="workspace-grid">
    <div className="workspace-pane left-pane" aria-label="Workspace">
      <div className="project-section">{projects}</div>
      <div className="explorer-section">{explorer}</div>
    </div>
    <aside className="workspace-pane output-pane" aria-label="Output">{output}</aside>
  </div>
</main>;

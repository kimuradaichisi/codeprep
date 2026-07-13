import type { ReactNode } from 'react';

export const AppShell = ({ projects, explorer, output }: Readonly<{
  projects: ReactNode; explorer: ReactNode; output: ReactNode;
}>) => <main className="desktop-workspace">
  <header className="workspace-header"><p className="eyebrow">CODEPREP DESKTOP</p><h1>Context workspace</h1></header>
  <div className="workspace-grid">
    <aside className="workspace-pane project-pane" aria-label="Projects">{projects}</aside>
    <section className="workspace-pane search-pane" aria-label="Explorer">{explorer}</section>
    <aside className="workspace-pane output-pane" aria-label="Output">{output}</aside>
  </div>
</main>;

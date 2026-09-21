import { useState } from 'react';
import type { ProjectPanelProps } from '../types';
import { InlineNotice } from './InlineNotice';

export const ProjectPanel = ({
  projects,
  projectNotice,
  indexStatus,
  indexTotalFiles,
  knowledgeStatus,
  knowledgeEntries,
  semanticStatus,
  semanticEntries,
  refreshIndex,
  addProject,
  chooseProjectFolder,
  removeProject,
}: ProjectPanelProps) => {
  const [path, setPath] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const submit = async (): Promise<void> => {
    if (!path.trim() || isAdding) return;
    setIsAdding(true);
    try {
      await addProject(path);
      setPath('');
    } finally {
      setIsAdding(false);
    }
  };

  const handleChoose = async (): Promise<void> => {
    if (isAdding) return;
    setIsAdding(true);
    try {
      await chooseProjectFolder();
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0 }}>
      <div className="pane-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
        <div><p className="eyebrow" style={{ margin: 0 }}>SOURCES</p><h2 style={{ fontSize: '15px', margin: 0 }}>Projects</h2></div>
        <span className="count" style={{ fontSize: '11px' }}>{projects.length}</span>
      </div>
      <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
        <button
          className="primary-button"
          disabled={isAdding}
          onClick={() => void handleChoose()}
          style={{ flex: '0 0 auto', padding: '4px 8px', fontSize: '11px', height: '28px', whiteSpace: 'nowrap' }}
        >
          Choose
        </button>
        <div style={{ display: 'flex', gap: '4px', flex: 1, minWidth: 0 }}>
          <input
            id="project-path"
            placeholder="Project path..."
            aria-label="Project path"
            disabled={isAdding}
            value={path}
            onChange={event => setPath(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter') void submit(); }}
            style={{ padding: '4px 8px', fontSize: '11px', height: '28px' }}
          />
          <button
            onClick={() => void submit()}
            disabled={isAdding || !path.trim()}
            style={{ flex: '0 0 auto', padding: '4px 8px', fontSize: '11px', height: '28px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
          >
            {isAdding && <span className="inline-spinner" />}
            {isAdding ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>
      {isAdding && (
        <div
          role="status"
          aria-live="polite"
          style={{
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 8px',
            background: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '3px',
            color: '#93c5fd'
          }}
        >
          <span className="inline-spinner" />
          <span>プロジェクトを走査しています... (Scanning project files...)</span>
        </div>
      )}
      {indexStatus && (
        <div style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px' }}>
          <span>
            Index: <strong style={{ textTransform: 'uppercase' }}>{indexStatus}</strong> ({indexTotalFiles ?? 0} files)
            {knowledgeStatus && (
              <> · Knowledge: <strong style={{ textTransform: 'uppercase' }}>{knowledgeStatus}</strong> ({knowledgeEntries ?? 0})</>
            )}
            {semanticStatus && (
              <> · Semantic: <strong style={{ textTransform: 'uppercase' }}>{semanticStatus}</strong> ({semanticEntries ?? 0})</>
            )}
          </span>
          {refreshIndex && <button onClick={() => void refreshIndex()} style={{ fontSize: '10px', padding: '2px 6px' }}>Refresh</button>}
        </div>
      )}
      <InlineNotice message={projectNotice} />
      <ul className="project-list" style={{ flex: 1, overflowY: 'auto' }}>
        {projects.map(project => (
          <li key={project.id}>
            <span title={project.rootPath} style={{ flex: 1, minWidth: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{project.name}</span>
            <button aria-label={`Remove ${project.name}`} onClick={() => void removeProject(project.id)}>Remove</button>
          </li>
        ))}
      </ul>
    </section>
  );
};

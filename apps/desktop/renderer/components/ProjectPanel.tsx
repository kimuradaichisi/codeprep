import { useState } from 'react';
import type { ProjectPanelProps } from '../types';
import { InlineNotice } from './InlineNotice';

export const ProjectPanel = ({ projects, projectNotice, addProject, chooseProjectFolder, removeProject }: ProjectPanelProps) => {
  const [path, setPath] = useState('');
  const submit = async (): Promise<void> => { await addProject(path); setPath(''); };
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0 }}>
      <div className="pane-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
        <div><p className="eyebrow" style={{ margin: 0 }}>SOURCES</p><h2 style={{ fontSize: '15px', margin: 0 }}>Projects</h2></div>
        <span className="count" style={{ fontSize: '11px' }}>{projects.length}</span>
      </div>
      <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
        <button className="primary-button" onClick={() => void chooseProjectFolder()} style={{ flex: '0 0 auto', padding: '4px 8px', fontSize: '11px', height: '28px', whiteSpace: 'nowrap' }}>Choose</button>
        <div style={{ display: 'flex', gap: '4px', flex: 1, minWidth: 0 }}>
          <input id="project-path" placeholder="Project path..." aria-label="Project path" value={path} onChange={event => setPath(event.target.value)} style={{ padding: '4px 8px', fontSize: '11px', height: '28px' }} />
          <button onClick={() => void submit()} style={{ flex: '0 0 auto', padding: '4px 8px', fontSize: '11px', height: '28px' }}>Add</button>
        </div>
      </div>
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

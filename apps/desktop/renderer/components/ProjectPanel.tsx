import { useState } from 'react';
import type { ProjectPanelProps } from '../types';
import { InlineNotice } from './InlineNotice';

export const ProjectPanel = ({ projects, projectNotice, addProject, chooseProjectFolder, removeProject }: ProjectPanelProps) => {
  const [path, setPath] = useState('');
  const submit = async (): Promise<void> => { await addProject(path); setPath(''); };
  return <section><div className="pane-heading"><div><p className="eyebrow">SOURCES</p><h2>Projects</h2></div><span className="count">{projects.length}</span></div>
    <button className="primary-button" onClick={() => void chooseProjectFolder()}>Choose folder</button>
    <label className="field-label" htmlFor="project-path">Project path</label>
    <div className="field-row"><input id="project-path" aria-label="Project path" value={path} onChange={event => setPath(event.target.value)} /><button onClick={() => void submit()}>Add project</button></div>
    <InlineNotice message={projectNotice} />
    <ul className="project-list">{projects.map(project => <li key={project.id}><span title={project.rootPath}>{project.name}</span><button aria-label={`Remove ${project.name}`} onClick={() => void removeProject(project.id)}>Remove</button></li>)}</ul>
  </section>;
};

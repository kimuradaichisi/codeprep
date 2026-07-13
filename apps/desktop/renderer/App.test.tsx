import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from './App';

const api = {
  addProject: async () => [],
  analyzeProjects: async () => ({ candidates: [], warnings: [] }), discoverFiles: async () => ({ candidates: [], warnings: [] }),
  chooseProjectFolder: async () => undefined,
  copyOutput: async () => undefined,
  generateOutput: async () => ({ preview: '', warning: 'Output generation is not available yet.' }),
  listProjectFiles: async () => [], listProjects: async () => [{ id: 'project-1', name: 'Demo', rootPath: 'C:/demo' }],
  removeProject: async () => [],
};

describe('App', () => {
  it('renders the desktop context workflow', () => {
    const markup = renderToStaticMarkup(<App api={api} />);

    expect(markup).toContain('Projects');
    expect(markup).toContain('Search files');
    expect(markup).toContain('Candidates');
    expect(markup).toContain('Copy output');
  });
});

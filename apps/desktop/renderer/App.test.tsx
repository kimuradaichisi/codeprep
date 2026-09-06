import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from './App';

import { createFallbackDesktopApi } from '../testUtils/mockDesktopApi';

const api = createFallbackDesktopApi({
  listProjects: async () => [{ id: 'project-1', name: 'Demo', rootPath: 'C:/demo' }],
  generateOutput: async () => ({ preview: '', warning: 'Output generation is not available yet.' }),
});

describe('App', () => {
  it('renders the desktop context workflow', () => {
    const markup = renderToStaticMarkup(<App api={api} />);

    expect(markup).toContain('Projects');
    expect(markup).toContain('Search files');
    expect(markup).toContain('Candidates');
    expect(markup).toContain('Copy output');
    expect(markup).toContain('Save output');
  });
});


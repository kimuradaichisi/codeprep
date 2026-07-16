import { useDesktopWorkspace } from './hooks/useDesktopWorkspace';
import type { DesktopApi } from '../DesktopApi';
import type { AppProps } from './types';
import { AppShell } from './components/AppShell';
import { CandidateTree } from './components/CandidateTree';
import { OutputPanel } from './components/OutputPanel';
import { ProjectPanel } from './components/ProjectPanel';
import { SearchPanel } from './components/SearchPanel';

const unavailableApi: DesktopApi = {
  addProject: async () => [], analyzeProjects: async () => ({ candidates: [], warnings: [] }),
  chooseProjectFolder: async () => undefined, copyOutput: async () => undefined,
  discoverFiles: async () => ({ candidates: [], warnings: [] }),
  listProjectFiles: async () => [],
  generateOutput: async () => ({ preview: '' }), listProjects: async () => [], removeProject: async () => [],
  readFileContent: async () => '',
};

import { FileViewerModal } from './components/FileViewerModal';

export const App = ({ api = defaultApi() }: AppProps) => {
  const workspace = useDesktopWorkspace(api);
  return (
    <>
      <AppShell
        projects={<ProjectPanel {...workspace.projectPanel} />}
        search={<SearchPanel {...workspace.searchPanel} />}
        tree={<CandidateTree {...workspace.treePanel} />}
        output={<OutputPanel {...workspace.outputPanel} />}
        isProjectsOpen={workspace.isProjectsOpen}
        toggleProjects={workspace.toggleProjects}
      />
      {workspace.activePreviewFile && (
        <FileViewerModal
          projectId={workspace.activePreviewFile.projectId}
          relativePath={workspace.activePreviewFile.relativePath}
          api={api}
          onClose={workspace.closeFile}
        />
      )}
    </>
  );
};

const defaultApi = (): DesktopApi =>
  typeof window === 'undefined' ? unavailableApi : window.codeprep ?? unavailableApi;

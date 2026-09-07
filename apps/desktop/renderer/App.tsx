import { useState } from 'react';
import { useDesktopWorkspace } from './hooks/useDesktopWorkspace';
import type { DesktopApi } from '../DesktopApi';
import type { AppProps } from './types';
import { AppShell } from './components/AppShell';
import { CandidateTree } from './components/CandidateTree';
import { OutputPanel } from './components/OutputPanel';
import { ProjectPanel } from './components/ProjectPanel';
import { SearchPanel } from './components/SearchPanel';
import { FileViewerModal } from './components/FileViewerModal';
import { SettingsModal } from './components/SettingsModal';
import { HelpModal } from './components/HelpModal';
import { createFallbackDesktopApi } from '../testUtils/mockDesktopApi';

const unavailableApi = createFallbackDesktopApi();

export const App = ({ api = defaultApi() }: AppProps) => {
  const workspace = useDesktopWorkspace(api);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <>
      <AppShell
        projects={<ProjectPanel {...workspace.projectPanel} />}
        search={<SearchPanel {...workspace.searchPanel} openSettings={() => setIsSettingsOpen(true)} />}
        tree={<CandidateTree {...workspace.treePanel} />}
        output={<OutputPanel {...workspace.outputPanel} />}
        isProjectsOpen={workspace.isProjectsOpen}
        toggleProjects={workspace.toggleProjects}
        openSettings={() => setIsSettingsOpen(true)}
        openHelp={() => setIsHelpOpen(true)}
      />
      {workspace.activePreviewFile && (
        <FileViewerModal
          projectId={workspace.activePreviewFile.projectId}
          relativePath={workspace.activePreviewFile.relativePath}
          api={api}
          onClose={workspace.closeFile}
        />
      )}
      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          onSaved={(settings) => {
            workspace.outputPanel.setTokenLimit(settings.defaultTokenLimit);
            workspace.outputPanel.setFormat(settings.defaultFormat);
            workspace.outputPanel.setPackMode(settings.defaultPackMode);
          }}
        />
      )}
      {isHelpOpen && (
        <HelpModal
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}
    </>
  );
};

const defaultApi = (): DesktopApi =>
  typeof window === 'undefined' ? unavailableApi : window.codeprep ?? unavailableApi;

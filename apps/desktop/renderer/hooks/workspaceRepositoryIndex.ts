import { useCallback, useEffect, useState } from 'react';
import type { DesktopApi, RepositoryIndexStatus } from '../../DesktopApi';

export type WorkspaceIndexState = Readonly<{
  indexStatus: RepositoryIndexStatus;
  indexTotalFiles: number;
  refreshIndex(): Promise<void>;
}>;

export const useWorkspaceRepositoryIndex = (
  api: DesktopApi,
  workspaceId = 'default'
): WorkspaceIndexState => {
  const [status, setStatus] = useState<RepositoryIndexStatus>('not_indexed');
  const [totalFiles, setTotalFiles] = useState(0);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.getRepositoryIndexStatus(workspaceId);
      setStatus(res.status);
      setTotalFiles(res.totalFiles);
    } catch {
      setStatus('degraded');
    }
  }, [api, workspaceId]);

  const refreshIndex = useCallback(async () => {
    setStatus('updating');
    try {
      const res = await api.refreshRepositoryIndex(workspaceId);
      setStatus(res.status);
      if (res.metrics) setTotalFiles(res.metrics.totalFiles);
    } catch {
      setStatus('degraded');
    }
  }, [api, workspaceId]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  return { indexStatus: status, indexTotalFiles: totalFiles, refreshIndex };
};

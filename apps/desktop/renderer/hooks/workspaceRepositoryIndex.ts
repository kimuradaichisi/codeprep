import { useCallback, useEffect, useState } from 'react';
import type {
  DesktopApi,
  RepositoryIndexStatus,
  StructuredKnowledgeIndexStatus,
} from '../../DesktopApi';

export type WorkspaceIndexState = Readonly<{
  indexStatus: RepositoryIndexStatus;
  indexTotalFiles: number;
  knowledgeStatus: StructuredKnowledgeIndexStatus;
  knowledgeEntries: number;
  refreshIndex(): Promise<void>;
}>;

export const useWorkspaceRepositoryIndex = (
  api: DesktopApi,
  workspaceId = 'default'
): WorkspaceIndexState => {
  const [status, setStatus] = useState<RepositoryIndexStatus>('not_indexed');
  const [totalFiles, setTotalFiles] = useState(0);
  const [knowledgeStatus, setKnowledgeStatus] = useState<StructuredKnowledgeIndexStatus>('not_built');
  const [knowledgeEntries, setKnowledgeEntries] = useState(0);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.getRepositoryIndexStatus(workspaceId);
      setStatus(res.status);
      setTotalFiles(res.totalFiles);
      if (res.knowledgeStatus) setKnowledgeStatus(res.knowledgeStatus);
      if (res.knowledgeEntries !== undefined) setKnowledgeEntries(res.knowledgeEntries);
    } catch {
      setStatus('degraded');
      setKnowledgeStatus('degraded');
    }
  }, [api, workspaceId]);

  const refreshIndex = useCallback(async () => {
    setStatus('updating');
    setKnowledgeStatus('building');
    try {
      const res = await api.refreshRepositoryIndex(workspaceId);
      setStatus(res.status);
      if (res.metrics) setTotalFiles(res.metrics.totalFiles);
      if (res.knowledgeStatus) setKnowledgeStatus(res.knowledgeStatus);
      if (res.knowledgeEntries !== undefined) setKnowledgeEntries(res.knowledgeEntries);
    } catch {
      setStatus('degraded');
      setKnowledgeStatus('degraded');
    }
  }, [api, workspaceId]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  return {
    indexStatus: status,
    indexTotalFiles: totalFiles,
    knowledgeStatus,
    knowledgeEntries,
    refreshIndex,
  };
};

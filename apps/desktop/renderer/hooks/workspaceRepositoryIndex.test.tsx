// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { createMockDesktopApi } from '../../testUtils/mockDesktopApi';
import {
  useWorkspaceRepositoryIndex,
  type WorkspaceIndexState,
} from './workspaceRepositoryIndex';

const renderIndexHook = async (api = createMockDesktopApi(), workspaceId = 'ws-1') => {
  const result: { current?: WorkspaceIndexState } = {};
  const root = createRoot(document.createElement('div'));
  const Probe = () => {
    result.current = useWorkspaceRepositoryIndex(api, workspaceId);
    return null;
  };
  await act(async () => {
    root.render(<Probe />);
    await new Promise(r => setTimeout(r, 0));
  });
  return { result };
};

describe('useWorkspaceRepositoryIndex', () => {
  it('loads initial index status on mount', async () => {
    const api = createMockDesktopApi({
      getRepositoryIndexStatus: vi.fn(async () => ({
        status: 'ready' as const,
        totalFiles: 42,
      })),
    });

    const { result } = await renderIndexHook(api, 'ws-1');
    expect(result.current?.indexStatus).toBe('ready');
    expect(result.current?.indexTotalFiles).toBe(42);
  });

  it('handles refreshIndex and updates totalFiles', async () => {
    const api = createMockDesktopApi({
      refreshRepositoryIndex: vi.fn(async () => ({
        status: 'ready' as const,
        metrics: { totalFiles: 100, added: 10, modified: 0, deleted: 0, unchanged: 90 },
        rebuilt: false,
      })),
    });

    const { result } = await renderIndexHook(api, 'ws-1');
    await act(async () => {
      await result.current?.refreshIndex();
    });

    expect(result.current?.indexStatus).toBe('ready');
    expect(result.current?.indexTotalFiles).toBe(100);
  });

  it('sets status to degraded on error without throwing', async () => {
    const api = createMockDesktopApi({
      getRepositoryIndexStatus: vi.fn(async () => Promise.reject(new Error('IPC failed'))),
    });

    const { result } = await renderIndexHook(api, 'ws-err');
    expect(result.current?.indexStatus).toBe('degraded');
  });
});

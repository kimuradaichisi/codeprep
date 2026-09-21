import { vi } from 'vitest';
import type { DesktopApi } from '../DesktopApi';

const defaultManifest = {
  projectId: 'mock-project',
  task: '',
  entryPoints: [],
  entries: [],
  budget: { bytes: 0, estimatedTokens: 0, limit: 0, withinLimit: true },
};

const createProjectMocks = () => ({
  chooseProjectFolder: vi.fn(async () => undefined),
  listProjectFiles: vi.fn(async () => []),
  listProjects: vi.fn(async () => []),
  addProject: vi.fn(async () => []),
  removeProject: vi.fn(async () => []),
  readFileContent: vi.fn(async () => ''),
  cancelScanProjectFiles: vi.fn(async () => undefined),
  getScanProgress: vi.fn(async () => ({ count: 0 })),
});

const createContextMocks = () => ({
  analyzeProjects: vi.fn(async () => ({ candidates: [], warnings: [] })),
  discoverFiles: vi.fn(async () => ({ candidates: [], warnings: [] })),
  generateOutput: vi.fn(async () => ({ preview: 'mock preview' })),
  copyOutput: vi.fn(async () => undefined),
  saveOutput: vi.fn(async () => ({ status: 'saved' as const, filePath: '/mock/path.md' })),
  buildTaskContext: vi.fn(async () => ({ manifest: defaultManifest, markdown: '', content: '', resolvedStrategy: 'standard' as const, candidates: [], warnings: [] })),
  discoverEntryPointCandidates: vi.fn(async () => ({ candidates: [], terms: [], warnings: [] })),
});

const createIndexMocks = () => ({
  getRepositoryIndexStatus: vi.fn(async () => ({ status: 'ready' as const, totalFiles: 0 })),
  refreshRepositoryIndex: vi.fn(async () => ({ status: 'ready' as const, rebuilt: false })),
});

export function createMockDesktopApi(overrides: Partial<DesktopApi> = {}): DesktopApi {
  return { ...createProjectMocks(), ...createContextMocks(), ...createIndexMocks(), ...overrides };
}

const defaultFallbackApi: DesktopApi = {
  chooseProjectFolder: async () => undefined,
  listProjectFiles: async () => [],
  listProjects: async () => [],
  addProject: async () => [],
  removeProject: async () => [],
  analyzeProjects: async () => ({ candidates: [], warnings: [] }),
  discoverFiles: async () => ({ candidates: [], warnings: [] }),
  generateOutput: async () => ({ preview: '' }),
  copyOutput: async () => undefined,
  saveOutput: async () => ({ status: 'cancelled' as const }),
  readFileContent: async () => '',
  buildTaskContext: async () => ({ manifest: defaultManifest, markdown: '', content: '', resolvedStrategy: 'standard' as const, candidates: [], warnings: [] }),
  discoverEntryPointCandidates: async () => ({ candidates: [], terms: [], warnings: [] }),
  getRepositoryIndexStatus: async () => ({ status: 'ready' as const, totalFiles: 0 }),
  refreshRepositoryIndex: async () => ({ status: 'ready' as const, rebuilt: false }),
  cancelScanProjectFiles: async () => undefined,
  getScanProgress: async () => ({ count: 0 }),
};

export function createFallbackDesktopApi(overrides: Partial<DesktopApi> = {}): DesktopApi {
  return { ...defaultFallbackApi, ...overrides };
}

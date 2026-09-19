// apps/desktop/KnowledgeStatusResolver.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { resolveKnowledgeStatus } from './KnowledgeStatusResolver';
import * as v2Helper from '../../src/features/repository-context/infrastructure/workingset/createPrepareContextPackV2UseCase';
import { SqliteRepositoryKnowledgeStore } from '../../src/features/repository-context/infrastructure/knowledge/sqlite/SqliteRepositoryKnowledgeStore';
import { GitCliRevisionAdapter } from '../../src/features/repository-context/infrastructure/git/GitCliRevisionAdapter';

vi.mock('../../src/features/repository-context/infrastructure/workingset/createPrepareContextPackV2UseCase', () => ({
  isKnowledgeDbAvailable: vi.fn(),
  resolveKnowledgeDbPath: vi.fn(() => '/mock/db.sqlite'),
}));

vi.mock('../../src/features/repository-context/infrastructure/knowledge/sqlite/SqliteRepositoryKnowledgeStore');
vi.mock('../../src/features/repository-context/infrastructure/git/GitCliRevisionAdapter');

describe('KnowledgeStatusResolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns missing when DB file does not exist', async () => {
    vi.mocked(v2Helper.isKnowledgeDbAvailable).mockReturnValue(false);

    const res = await resolveKnowledgeStatus('/fake/repo');
    expect(res.status).toBe('missing');
    expect(res.message).toContain('missing');
  });

  it('returns ready when snapshot is synced and working tree is clean', async () => {
    vi.mocked(v2Helper.isKnowledgeDbAvailable).mockReturnValue(true);

    const mockStore = {
      getStatistics: vi.fn().mockResolvedValue({ nodeCount: 15 }),
      findLatest: vi.fn().mockResolvedValue({ revision: 'abc1234' }),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const mockGit = {
      currentRevision: vi.fn().mockResolvedValue('abc1234'),
      isWorkingTreeClean: vi.fn().mockResolvedValue(true),
    };

    const res = await resolveKnowledgeStatus('/fake/repo', {
      createStore: () => mockStore,
      createGit: () => mockGit,
    });
    expect(res.status).toBe('ready');
    expect(res.commitHash).toBe('abc1234');
    expect(mockStore.close).toHaveBeenCalled();
  });

  it('returns stale when commit hashes mismatch', async () => {
    vi.mocked(v2Helper.isKnowledgeDbAvailable).mockReturnValue(true);

    const mockStore = {
      getStatistics: vi.fn().mockResolvedValue({ nodeCount: 15 }),
      findLatest: vi.fn().mockResolvedValue({ revision: 'old1111' }),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const mockGit = {
      currentRevision: vi.fn().mockResolvedValue('new2222'),
      isWorkingTreeClean: vi.fn().mockResolvedValue(true),
    };

    const res = await resolveKnowledgeStatus('/fake/repo', {
      createStore: () => mockStore,
      createGit: () => mockGit,
    });
    expect(res.status).toBe('stale');
    expect(res.message).toContain('stale');
  });

  it('returns dirty when working tree is not clean', async () => {
    vi.mocked(v2Helper.isKnowledgeDbAvailable).mockReturnValue(true);

    const mockStore = {
      getStatistics: vi.fn().mockResolvedValue({ nodeCount: 15 }),
      findLatest: vi.fn().mockResolvedValue({ revision: 'abc1234' }),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const mockGit = {
      currentRevision: vi.fn().mockResolvedValue('abc1234'),
      isWorkingTreeClean: vi.fn().mockResolvedValue(false),
    };

    const res = await resolveKnowledgeStatus('/fake/repo', {
      createStore: () => mockStore,
      createGit: () => mockGit,
    });
    expect(res.status).toBe('dirty');
    expect(res.message).toContain('uncommitted modifications');
  });
});


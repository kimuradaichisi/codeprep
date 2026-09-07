// apps/desktop/TaskContextHandler.test.ts
import { describe, expect, it, vi } from 'vitest';
import { handleBuildTaskContext } from './TaskContextHandler';
import type { ProjectRegistryStore } from '../../src/features/repository-context/infrastructure/filesystem/ProjectRegistryStore';

vi.mock('../../src/features/repository-context/infrastructure/filesystem/ProjectFileTree', () => ({
  listProjectFiles: vi.fn(async () => ['src/order/OrderService.ts', 'src/order/ReturnPolicy.ts']),
}));

vi.mock('../../src/features/repository-context/infrastructure/filesystem/ProjectFileContentReader', () => ({
  canReadProjectFile: vi.fn(() => true),
  readProjectFile: vi.fn(async () => 'import { ReturnPolicy } from "./ReturnPolicy";'),
  getProjectFileSize: vi.fn(async () => 100),
}));

describe('TaskContextHandler', () => {
  const mockRegistry = {
    getByIds: vi.fn(async (ids: readonly string[]) => {
      if (ids.includes('proj-1')) {
        return [{ id: 'proj-1', name: 'proj', rootPath: '/test/proj' }];
      }
      return [];
    }),
  } as unknown as ProjectRegistryStore;

  it('successfully builds task context and formats manifest', async () => {
    const request = {
      projectId: 'proj-1',
      task: 'Add return policy',
      entryPoints: ['src/order/OrderService.ts'],
    };

    const result = await handleBuildTaskContext(mockRegistry, request);
    expect(result.manifest).toBeDefined();
    expect(result.manifest.task).toBe('Add return policy');
    expect(result.markdown).toContain('# Context Manifest');
    expect(result.markdown).toContain('Add return policy');
    expect(result.candidates.length).toBeGreaterThanOrEqual(1);
    expect(result.content).toBeDefined();
    expect(result.resolvedStrategy).toBeDefined();
    expect(result.warnings).toEqual([]);
  });

  it('throws error when project does not exist', async () => {
    const request = {
      projectId: 'non-existent',
      task: 'Task',
      entryPoints: ['src/a.ts'],
    };
    await expect(handleBuildTaskContext(mockRegistry, request)).rejects.toThrow('Project was not found: non-existent');
  });

  it('throws error when request is invalid', async () => {
    await expect(handleBuildTaskContext(mockRegistry, null)).rejects.toThrow('Invalid task context request.');
  });
});

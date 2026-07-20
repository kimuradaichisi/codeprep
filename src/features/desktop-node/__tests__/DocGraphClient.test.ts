import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync } from 'node:fs';
import { DocGraphClient } from '../DocGraphClient';
import type { ProcessRunner } from '../RipgrepClient';
import type { Project } from '../../desktop-core/domain/Project';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
  };
});

describe('DocGraphClient', () => {
  const project: Project = { id: 'p1', name: 'Project 1', rootPath: '/test/project' };
  let mockRunner: ProcessRunner;
  let runFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    runFn = vi.fn();
    mockRunner = { run: runFn as unknown as ProcessRunner['run'] };
    vi.mocked(existsSync).mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should return empty list if db file does not exist', async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const client = new DocGraphClient(mockRunner);
    const result = await client.findRelated(project, 'src/main.md');
    expect(result).toEqual([]);
    expect(runFn).not.toHaveBeenCalled();
  });

  it('should call command and parse json output on success', async () => {
    vi.mocked(existsSync).mockImplementation((path) => String(path).endsWith('graph.db'));
    runFn.mockResolvedValue({
      stdout: JSON.stringify({
        related: [
          { path: 'docs/test.md', reason: 'referenced', confidence: 0.9 }
        ]
      }),
      stderr: '',
      exitCode: 0
    });
    
    const client = new DocGraphClient(mockRunner);
    const result = await client.findRelated(project, 'src/main.md');
    expect(result).toEqual([
      { path: 'docs/test.md', reason: 'referenced', confidence: 0.9 }
    ]);
    expect(runFn).toHaveBeenCalledWith('docgraph', ['related', 'src/main.md', '--format', 'json'], '/test/project');
  });

  it('should fallback to empty list on command failure', async () => {
    vi.mocked(existsSync).mockImplementation((path) => String(path).endsWith('graph.db'));
    runFn.mockResolvedValue({ stdout: '', stderr: 'error', exitCode: 1 });
    const client = new DocGraphClient(mockRunner);
    const result = await client.findRelated(project, 'src/main.md');
    expect(result).toEqual([]);
  });

  it('should ignore malformed related entries', async () => {
    vi.mocked(existsSync).mockImplementation((path) => String(path).endsWith('graph.db'));
    runFn.mockResolvedValue({
      stdout: JSON.stringify({ related: [
        { path: 'docs/valid.md', reason: 'linked', confidence: 0.8 },
        { path: '../outside.md', reason: 'escape', confidence: 0.9 },
        { path: 'docs/no-score.md', reason: 'missing', confidence: Number.NaN },
        { path: 123, reason: 'wrong path', confidence: 0.5 },
      ] }),
      stderr: '',
      exitCode: 0,
    });

    const result = await new DocGraphClient(mockRunner).findRelated(project, 'src/main.md');

    expect(result).toEqual([{ path: 'docs/valid.md', reason: 'linked', confidence: 0.8 }]);
  });

  it('should use custom path if env var is set', async () => {
    vi.mocked(existsSync).mockImplementation((path) => String(path).endsWith('graph.db'));
    vi.stubEnv('CODEPREP_DOCGRAPH_PATH', '/custom/bin/docgraph');
    runFn.mockResolvedValue({ stdout: '{"related":[]}', stderr: '', exitCode: 0 });
    const client = new DocGraphClient(mockRunner);
    await client.findRelated(project, 'src/main.md');
    expect(runFn).toHaveBeenCalledWith('/custom/bin/docgraph', expect.any(Array), expect.any(String));
  });

  it('should use local exe if present', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      const p = String(path);
      return p.endsWith('graph.db') || p.includes('docgraph.exe') || p.includes('docgraph');
    });
    runFn.mockResolvedValue({ stdout: '{"related":[]}', stderr: '', exitCode: 0 });
    const client = new DocGraphClient(mockRunner);
    await client.findRelated(project, 'src/main.md');
    expect(runFn.mock.calls[0][0]).toContain('docgraph');
  });
});

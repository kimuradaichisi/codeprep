/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { WorkspaceExcludeProvider, parseGitignoreToGlobs } from '../WorkspaceExcludeProvider';

vi.mock('vscode', () => ({
  Uri: { file: vi.fn((p: string) => ({ fsPath: p, path: p })) },
  workspace: {
    getConfiguration: vi.fn(),
    fs: { readFile: vi.fn() },
  },
}));

describe('WorkspaceExcludeProvider', () => {
  const root = 'C:/workspace/project';
  let provider: WorkspaceExcludeProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new WorkspaceExcludeProvider(root);
  });

  it('parseGitignoreToGlobs: .gitignore の各行を glob に変換すること', () => {
    const gitignore = `
# Comment
build/
*.log
!important.log
dist
`;
    const globs = parseGitignoreToGlobs(gitignore);
    expect(globs).toContain('**/build/**');
    expect(globs).toContain('**/*.log');
    expect(globs).toContain('**/dist/**');
    expect(globs.some((g) => g.includes('important'))).toBe(false);
  });

  it('getExcludePattern: デフォルトと設定とgitignoreを統合したパターンを返すこと', async () => {
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((key: string, def: unknown) => {
        if (key === 'exclude') return ['**/custom-exclude/**'];
        if (key === 'useGitignore') return true;
        return def;
      }),
    } as any);

    const gitignoreContent = new TextEncoder().encode('temp/\n');
    vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(gitignoreContent);

    const pattern = await provider.getExcludePattern();
    expect(pattern).toBeDefined();
    expect(pattern).toContain('custom-exclude');
    expect(pattern).toContain('temp');
    expect(pattern).toContain('node_modules');
  });

  it('getExcludePattern: gitignore が読めなくてもデフォルトと設定のみで動作すること', async () => {
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((key: string, def: unknown) => def),
    } as any);
    vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(new Error('ENOENT'));

    const pattern = await provider.getExcludePattern();
    expect(pattern).toBeDefined();
    expect(pattern).toContain('node_modules');
  });
});

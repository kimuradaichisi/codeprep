/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { ClipboardSelectionUseCase } from '../ClipboardSelectionUseCase';
import { Selection } from '../../domain/Selection';
import { VSCodeWorkspacePathResolver } from '../../infrastructure/VSCodeWorkspacePathResolver';

vi.mock('vscode', () => ({
  env: { clipboard: { readText: vi.fn() } },
  window: { showInformationMessage: vi.fn(), showWarningMessage: vi.fn() },
  Uri: {
    file: vi.fn((p: string) => ({ fsPath: p, path: p.replace(/\\/g, '/') })),
  },
  workspace: {
    getConfiguration: vi.fn().mockImplementation(() => ({ get: (_k: string, d: unknown) => d })),
    findFiles: vi.fn(),
    asRelativePath: vi.fn((uri: any) => {
      const p = (uri.path || uri.fsPath || uri).replace(/\\/g, '/');
      return p.replace('C:/workspace/project/', '');
    }),
    fs: {
      stat: vi.fn(),
      readFile: vi.fn().mockRejectedValue(new Error('no gitignore')),
    },
  },
}));

describe('ClipboardSelection Performance & Call Characteristics', () => {
  let useCase: ClipboardSelectionUseCase;
  let selection: Selection;
  const mockRoot = 'C:/workspace/project';

  beforeEach(() => {
    vi.clearAllMocks();
    selection = new Selection();
    const resolver = new VSCodeWorkspacePathResolver(mockRoot);
    useCase = new ClipboardSelectionUseCase(selection, resolver);
  });

  it('1 explicit path: Fast Path (findFiles calls = 0)', async () => {
    vi.mocked(vscode.env.clipboard.readText).mockResolvedValue('src/app.ts');
    vi.mocked(vscode.workspace.fs.stat).mockResolvedValue({ type: 1 } as any);

    const start = performance.now();
    await useCase.selectFromClipboard();
    const duration = performance.now() - start;

    expect(selection.getPaths()).toContain('src/app.ts');
    expect(vscode.workspace.findFiles).toHaveBeenCalledTimes(0);
    console.log(`[Perf] 1 explicit path: ${duration.toFixed(2)}ms, findFiles calls: 0`);
  });

  it('20 explicit paths: Fast Path (findFiles calls = 0)', async () => {
    const paths = Array.from({ length: 20 }, (_, i) => `src/file_${i}.ts`);
    vi.mocked(vscode.env.clipboard.readText).mockResolvedValue(paths.join('\n'));
    vi.mocked(vscode.workspace.fs.stat).mockResolvedValue({ type: 1 } as any);

    const start = performance.now();
    await useCase.selectFromClipboard();
    const duration = performance.now() - start;

    expect(selection.count).toBeGreaterThan(0);
    expect(vscode.workspace.findFiles).toHaveBeenCalledTimes(0);
    console.log(`[Perf] 20 explicit paths: ${duration.toFixed(2)}ms, findFiles calls: 0`);
  });

  it('100 explicit paths: Fast Path (findFiles calls = 0)', async () => {
    const paths = Array.from({ length: 100 }, (_, i) => `src/components/item_${i}.tsx`);
    vi.mocked(vscode.env.clipboard.readText).mockResolvedValue(paths.join('\n'));
    vi.mocked(vscode.workspace.fs.stat).mockResolvedValue({ type: 1 } as any);

    const start = performance.now();
    await useCase.selectFromClipboard();
    const duration = performance.now() - start;

    expect(selection.count).toBeGreaterThan(0);
    expect(vscode.workspace.findFiles).toHaveBeenCalledTimes(0);
    console.log(`[Perf] 100 explicit paths: ${duration.toFixed(2)}ms, findFiles calls: 0`);
  });

  it('1 basename fallback: Targeted Lookup (findFiles calls = 1, never **/*)', async () => {
    vi.mocked(vscode.env.clipboard.readText).mockResolvedValue('theme.sass');
    // Fast path: file does not exist directly
    vi.mocked(vscode.workspace.fs.stat).mockRejectedValue(new Error('ENOENT'));
    vi.mocked(vscode.workspace.findFiles).mockResolvedValueOnce([
      { path: 'C:/workspace/project/src/theme.sass', fsPath: 'C:/workspace/project/src/theme.sass' } as any,
    ]);

    const start = performance.now();
    await useCase.selectFromClipboard();
    const duration = performance.now() - start;

    expect(selection.getPaths()).toContain('src/theme.sass');
    expect(vscode.workspace.findFiles).toHaveBeenCalledTimes(1);
    expect(vscode.workspace.findFiles).not.toHaveBeenCalledWith('**/*', expect.anything());
    console.log(`[Perf] 1 basename fallback: ${duration.toFixed(2)}ms, findFiles calls: 1`);
  });

  it('10 basename fallback: Targeted Lookup (findFiles calls <= 10, never **/*)', async () => {
    const files = Array.from({ length: 10 }, (_, i) => `component_${i}.vue`);
    vi.mocked(vscode.env.clipboard.readText).mockResolvedValue(files.join('\n'));
    vi.mocked(vscode.workspace.fs.stat).mockRejectedValue(new Error('ENOENT'));
    vi.mocked(vscode.workspace.findFiles).mockImplementation((pattern: vscode.GlobPattern) => {
      const patStr = typeof pattern === 'string' ? pattern : pattern.pattern;
      const name = patStr.replace(/^\*\*\//, '');
      return Promise.resolve([
        { path: `C:/workspace/project/src/components/${name}`, fsPath: `C:/workspace/project/src/components/${name}` } as any,
      ]);
    });

    const start = performance.now();
    await useCase.selectFromClipboard();
    const duration = performance.now() - start;

    expect(vscode.workspace.findFiles).toHaveBeenCalledTimes(10);
    expect(vscode.workspace.findFiles).not.toHaveBeenCalledWith('**/*', expect.anything());
    console.log(`[Perf] 10 basename fallback: ${duration.toFixed(2)}ms, findFiles calls: 10`);
  });
});

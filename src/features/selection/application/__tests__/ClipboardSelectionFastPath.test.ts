/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { ClipboardSelectionUseCase } from '../ClipboardSelectionUseCase';
import { Selection } from '../../domain/Selection';
import { VSCodeWorkspacePathResolver } from '../../infrastructure/VSCodeWorkspacePathResolver';

const mockProjectFiles = [
  'C:/workspace/project/src/commands/__tests__/OutputCommands.test.ts',
  'C:/workspace/project/src/features/engine/__tests__/OutputEngine.test.ts',
  'C:/workspace/project/src/commands/OutputCommands.ts',
  'C:/workspace/project/src/components/App.css',
  'C:/workspace/project/src/app.ts',
  'C:/workspace/project/README.md',
  'C:/workspace/project/src/App.vue',
  'C:/workspace/project/src/theme.sass',
  'c:/project/src/index.ts',
];

vi.mock('vscode', () => ({
  env: { clipboard: { readText: vi.fn() } },
  window: { showInformationMessage: vi.fn(), showWarningMessage: vi.fn() },
  Uri: {
    file: vi.fn().mockImplementation((p: string) => ({
      fsPath: p,
      path: p.replace(/\\/g, '/'),
    })),
  },
  workspace: {
    getConfiguration: vi.fn().mockImplementation(() => ({ get: (_k: string, d: unknown) => d })),
    findFiles: vi.fn(),
    asRelativePath: vi.fn().mockImplementation((uri: any) => {
      const p = (uri.path || uri.fsPath || uri).replace(/\\/g, '/');
      return p.replace('C:/workspace/project/', '').replace('c:/project/', '');
    }),
    fs: {
      stat: vi.fn().mockImplementation(async (uri: any) => {
        const p = (uri.fsPath || uri.path || String(uri)).replace(/\\/g, '/');
        const found = mockProjectFiles.some(
          (f) => f.toLowerCase() === p.toLowerCase()
        );
        if (found) return { type: 1 };
        const err: any = new Error('FileNotFound');
        err.code = 'FileNotFound';
        throw err;
      }),
      readFile: vi.fn().mockRejectedValue(new Error('no gitignore')),
    },
  },
}));

describe('ClipboardSelectionUseCase Fast Path & Targeted Fallback', () => {
  let useCase: ClipboardSelectionUseCase;
  let selection: Selection;
  const mockRoot = 'C:/workspace/project';

  beforeEach(() => {
    vi.clearAllMocks();
    selection = new Selection();
    const resolver = new VSCodeWorkspacePathResolver(mockRoot);
    useCase = new ClipboardSelectionUseCase(selection, resolver);
  });

  it('Case 1: relative path の Fast Path では findFiles を一切呼ばないこと', async () => {
    vi.mocked(vscode.env.clipboard.readText).mockResolvedValue('src/app.ts');

    await useCase.selectFromClipboard();

    expect(selection.getPaths()).toContain('src/app.ts');
    expect(selection.getPaths()).toContain('src');
    expect(vscode.workspace.findFiles).not.toHaveBeenCalled();
  });

  it('Case 2: Windows absolute path は正規化され直接確認され全走査しないこと', async () => {
    const winPath = 'C:\\workspace\\project\\src\\components\\App.css';
    vi.mocked(vscode.env.clipboard.readText).mockResolvedValue(winPath);

    await useCase.selectFromClipboard();

    expect(selection.getPaths()).toContain('src/components/App.css');
    expect(vscode.workspace.findFiles).not.toHaveBeenCalled();
  });

  it('Case 3: drive letter の大文字小文字差異を許容して直接確認できること', async () => {
    const lowerRoot = 'c:/project';
    const upperInput = 'C:\\Project\\src\\index.ts';
    const sut = new ClipboardSelectionUseCase(selection, new VSCodeWorkspacePathResolver(lowerRoot));
    vi.mocked(vscode.env.clipboard.readText).mockResolvedValue(upperInput);

    await sut.selectFromClipboard();

    expect(selection.getPaths()).toContain('src/index.ts');
    expect(vscode.workspace.findFiles).not.toHaveBeenCalled();
  });

  it('Case 4: basename fallback は targeted search を行い一意な候補を採用すること', async () => {
    vi.mocked(vscode.env.clipboard.readText).mockResolvedValue('theme.sass');
    vi.mocked(vscode.workspace.findFiles).mockResolvedValueOnce([
      { path: 'C:/workspace/project/src/theme.sass', fsPath: 'C:/workspace/project/src/theme.sass' } as any,
    ]);

    await useCase.selectFromClipboard();

    expect(selection.getPaths()).toContain('src/theme.sass');
    expect(vscode.workspace.findFiles).toHaveBeenCalledTimes(1);
    expect(vscode.workspace.findFiles).not.toHaveBeenCalledWith('**/*', expect.anything());
    expect(vscode.workspace.findFiles).toHaveBeenCalledWith(
      expect.stringMatching(/theme\.sass/),
      expect.anything(),
      2
    );
  });

  it('Case 5: multi-segment suffix fallback は targeted search で解決できること', async () => {
    vi.mocked(vscode.env.clipboard.readText).mockResolvedValue('commands/OutputCommands.ts');
    vi.mocked(vscode.workspace.findFiles).mockResolvedValueOnce([
      { path: 'C:/workspace/project/src/commands/OutputCommands.ts', fsPath: 'C:/workspace/project/src/commands/OutputCommands.ts' } as any,
    ]);

    await useCase.selectFromClipboard();

    expect(selection.getPaths()).toContain('src/commands/OutputCommands.ts');
    expect(vscode.workspace.findFiles).toHaveBeenCalledTimes(1);
    expect(vscode.workspace.findFiles).not.toHaveBeenCalledWith('**/*', expect.anything());
    expect(vscode.workspace.findFiles).toHaveBeenCalledWith(
      expect.stringMatching(/commands[\\/]OutputCommands\.ts/),
      expect.anything(),
      2
    );
  });

  it('Case 6: ambiguous な結果 (複数件マッチ) の場合は勝手に選ばず追加しないこと', async () => {
    vi.mocked(vscode.env.clipboard.readText).mockResolvedValue('theme.sass');
    vi.mocked(vscode.workspace.findFiles).mockResolvedValueOnce([
      { path: 'C:/workspace/project/src/a/theme.sass', fsPath: 'C:/workspace/project/src/a/theme.sass' } as any,
      { path: 'C:/workspace/project/src/b/theme.sass', fsPath: 'C:/workspace/project/src/b/theme.sass' } as any,
    ]);

    await useCase.selectFromClipboard();

    expect(selection.getPaths()).not.toContain('src/a/theme.sass');
    expect(selection.getPaths()).not.toContain('src/b/theme.sass');
    expect(selection.count).toBe(0);
  });

  it('Case 7: 多数の明示 relative path があっても findFiles は一度も呼ばれないこと', async () => {
    const paths = Array.from({ length: 25 }, () => 'src/app.ts').join('\n');
    vi.mocked(vscode.env.clipboard.readText).mockResolvedValue(paths);

    await useCase.selectFromClipboard();

    expect(selection.getPaths()).toContain('src/app.ts');
    expect(vscode.workspace.findFiles).not.toHaveBeenCalled();
  });
});

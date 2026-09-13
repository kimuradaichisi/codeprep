/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { ClipboardSelectionUseCase } from '../ClipboardSelectionUseCase';
import { Selection } from '../../domain/Selection';
import { VSCodeWorkspacePathResolver } from '../../infrastructure/VSCodeWorkspacePathResolver';

const mockFiles = [
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
    getConfiguration: vi.fn().mockImplementation(() => ({ get: (_k: string, d: any) => d })),
    findFiles: vi.fn().mockImplementation((pattern: vscode.GlobPattern) => {
      const rawPattern = typeof pattern === 'string' ? pattern : pattern.pattern;
      const raw = rawPattern.replace(/^\*\*\//, '').replace(/\\/g, '/');
      const matched = mockFiles.filter(f => f.toLowerCase().endsWith(raw.toLowerCase()));
      return Promise.resolve(matched.map(f => ({ path: f, fsPath: f })));
    }),
    asRelativePath: vi.fn().mockImplementation((uri: any) => {
      const p = (uri.path || uri.fsPath || uri).replace(/\\/g, '/');
      return p.replace('C:/workspace/project/', '').replace('c:/project/', '');
    }),
    fs: {
      stat: vi.fn().mockImplementation(async (uri: any) => {
        const p = (uri.fsPath || uri.path || String(uri)).replace(/\\/g, '/');
        const found = mockFiles.some(f => f.toLowerCase() === p.toLowerCase());
        if (found) return { type: 1 };
        const err: any = new Error('FileNotFound');
        err.code = 'FileNotFound';
        throw err;
      }),
      readFile: vi.fn().mockRejectedValue(new Error('no gitignore')),
    },
  },
}));

describe('ClipboardSelectionUseCase', () => {
  let useCase: ClipboardSelectionUseCase;
  let selection: Selection;
  const mockRoot = 'C:/workspace/project';

  beforeEach(() => {
    vi.clearAllMocks();
    selection = new Selection();
    useCase = new ClipboardSelectionUseCase(selection, new VSCodeWorkspacePathResolver(mockRoot));
  });

  it('should not notify when clipboard.watch is disabled', async () => {
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValueOnce({ get: () => false } as any);
    vi.mocked(vscode.env.clipboard.readText).mockResolvedValue('src/app.ts');

    await useCase.selectFromClipboard();

    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
  });

  it('Vitestの失敗レポートからパスを抽出し、親ディレクトリ含め選択状態にできること', async () => {
    const report = `
      FAIL src/commands/__tests__/OutputCommands.test.ts > OutputCommands
      FAIL src/features/engine/__tests__/OutputEngine.test.ts
      TypeError: Cannot read properties...
      ❯ OutputCommands.finalize src/commands/OutputCommands.ts:110:42
    `;
    vi.mocked(vscode.env.clipboard.readText).mockResolvedValue(report);

    await useCase.selectFromClipboard();

    const paths = selection.getPaths();

    expect(paths).toContain('src/commands/__tests__/OutputCommands.test.ts');
    expect(paths).toContain('src/features/engine/__tests__/OutputEngine.test.ts');
    expect(paths).toContain('src/commands/OutputCommands.ts');
    expect(paths).toContain('src/commands');
    expect(paths).toContain('src/features/engine');
    expect(vscode.window.showInformationMessage).toHaveBeenCalled();
  });

  it('Windowsの絶対パスをワークスペース相対パスに変換して抽出できること', async () => {
    const winPath = 'C:\\workspace\\project\\src\\components\\App.css';
    const text = `Processing file: ${winPath}`;
    vi.mocked(vscode.env.clipboard.readText).mockResolvedValue(text);

    await useCase.selectFromClipboard();

    expect(selection.getPaths()).toContain('src/components/App.css');
    expect(selection.getPaths()).toContain('src/components');
  });

  it('重複するパスは1つとして扱われること', async () => {
    const text = 'src/app.ts and src/app.ts again.';
    vi.mocked(vscode.env.clipboard.readText).mockResolvedValue(text);

    await useCase.selectFromClipboard();

    expect(selection.getPaths()).toContain('src/app.ts');
    const filesOnly = selection.getPaths().filter(p => p.endsWith('.ts'));
    expect(filesOnly).toHaveLength(1);
  });

  it('node_modules や .git 等の無関係なパスを除外すること', async () => {
    const text = 'Check node_modules/react/index.js, .git/config, and README.md';
    vi.mocked(vscode.env.clipboard.readText).mockResolvedValue(text);

    await useCase.selectFromClipboard();

    const paths = selection.getPaths();
    expect(paths).not.toContain('node_modules/react/index.js');
    expect(paths).not.toContain('.git/config');
    expect(paths).toContain('README.md');
  });

  it('未知の拡張子（.svelte, .vue等）でもパス形式なら抽出できること', async () => {
    const text = 'Modify src/App.vue and src/theme.sass';
    vi.mocked(vscode.env.clipboard.readText).mockResolvedValue(text);

    await useCase.selectFromClipboard();

    expect(selection.getPaths()).toContain('src/App.vue');
    expect(selection.getPaths()).toContain('src/theme.sass');
  });

  it('パスが見つからない場合に適切な警告を表示すること', async () => {
    vi.mocked(vscode.env.clipboard.readText).mockResolvedValue('No paths here!');

    await useCase.selectFromClipboard();

    expect(vscode.window.showWarningMessage).toHaveBeenCalled();
    expect(selection.count).toBe(0);
  });

  it('ドライブレターの大文字小文字差異を許容して正規化すること', async () => {
    const lowerRoot = 'c:/project';
    const upperInput = 'C:\\Project\\src\\index.ts';
    const sut = new ClipboardSelectionUseCase(selection, new VSCodeWorkspacePathResolver(lowerRoot));
    vi.mocked(vscode.env.clipboard.readText).mockResolvedValue(upperInput);

    await sut.selectFromClipboard();

    expect(selection.getPaths()).toContain('src/index.ts');
  });

  it('完全一致しない場合でも、実在する一意なファイル名から後方一致で解決できること', async () => {
    vi.mocked(vscode.env.clipboard.readText).mockResolvedValue('theme.sass');

    await useCase.selectFromClipboard();

    expect(selection.getPaths()).toContain('src/theme.sass');
  });

  it('複数セグメントを含む後方一致で解決できること', async () => {
    vi.mocked(vscode.env.clipboard.readText).mockResolvedValue('commands/OutputCommands.ts');

    await useCase.selectFromClipboard();

    expect(selection.getPaths()).toContain('src/commands/OutputCommands.ts');
  });
});
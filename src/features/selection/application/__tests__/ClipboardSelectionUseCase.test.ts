/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { ClipboardSelectionUseCase } from '../ClipboardSelectionUseCase';
import { Selection } from '../../domain/Selection';

vi.mock('vscode', () => ({
  env: { clipboard: { readText: vi.fn() } },
  window: { showInformationMessage: vi.fn(), showWarningMessage: vi.fn() }
}));

describe('ClipboardSelectionUseCase', () => {
  let useCase: ClipboardSelectionUseCase;
  let selection: Selection;
  const mockRoot = 'C:/workspace/project';

  beforeEach(() => {
    vi.clearAllMocks();
    selection = new Selection();
    useCase = new ClipboardSelectionUseCase(selection, mockRoot);
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
    
    // 抽出されたファイルパス
    expect(paths).toContain('src/commands/__tests__/OutputCommands.test.ts');
    expect(paths).toContain('src/features/engine/__tests__/OutputEngine.test.ts');
    expect(paths).toContain('src/commands/OutputCommands.ts');
    
    // 親ディレクトリも含まれる
    expect(paths).toContain('src/commands');
    expect(paths).toContain('src/features/engine');

    // 件数は親ディレクトリ展開後の総数
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining('Selected')
    );
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

    // app.ts とその親 src が登録される
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

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      expect.stringContaining('No project-related paths found')
    );
    expect(selection.count).toBe(0);
  });

  it('ドライブレターの大文字小文字差異を許容して正規化すること', async () => {
    const lowerRoot = 'c:/project';
    const upperInput = 'C:\\Project\\src\\index.ts';
    const sut = new ClipboardSelectionUseCase(selection, lowerRoot);
    vi.mocked(vscode.env.clipboard.readText).mockResolvedValue(upperInput);

    await sut.selectFromClipboard();

    expect(selection.getPaths()).toContain('src/index.ts');
  });
});
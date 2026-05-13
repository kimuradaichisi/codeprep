import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { FileTreeProvider } from '../FileTreeProvider';
import { Selection } from '../../selection/domain/Selection';
import { ok } from '../../../shared/domain/Result';

vi.mock('vscode', () => {
    class MockTreeItem {
        constructor(public label: string, public collapsibleState: any) { }
        public checkboxState: any;
        public resourceUri: any;
        public contextValue: string = '';
        public iconPath: any;
    }
    class MockRelativePattern {
        constructor(public base: any, public pattern: string) { }
    }
    return {
        TreeItem: MockTreeItem,
        TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
        TreeItemCheckboxState: { Unchecked: 0, Checked: 1 },
        RelativePattern: MockRelativePattern,
        ThemeIcon: vi.fn(id => id),
        EventEmitter: class {
            event = vi.fn();
            fire = vi.fn();
        },
        Uri: { file: vi.fn((p) => ({ fsPath: p })) },
        FileType: { File: 1, Directory: 2 },
        workspace: {
            createFileSystemWatcher: vi.fn(() => ({
                onDidCreate: vi.fn(),
                onDidChange: vi.fn(),
                onDidDelete: vi.fn(),
                dispose: vi.fn()
            })),
            getConfiguration: vi.fn()
        }
    };
});

vi.mock('../../../utils/path', () => ({
    normalizePath: vi.fn(p => p.replace(/\\/g, '/')),
    getRelativePath: vi.fn((root, target) => target.replace(root + '/', ''))
}));

describe('FileTreeProvider Optimization & Functionality', () => {
    let provider: FileTreeProvider;
    let selection: Selection;
    let mockFileSystem: any;
    let mockGitWatcher: any;
    const mockRoot = '/root';

    beforeEach(() => {
        vi.clearAllMocks();
        selection = new Selection();
        mockFileSystem = { readDirectory: vi.fn() };
        mockGitWatcher = { isModified: vi.fn(), updateCache: vi.fn() };

        (vscode.workspace.getConfiguration as any).mockReturnValue({
            get: vi.fn((key, def) => {
                if (key === 'exclude') return ['node_modules'];
                if (key === 'excludePatterns') return ['\\.tmp$'];
                return def;
            })
        });
        provider = new FileTreeProvider(mockRoot, selection, mockFileSystem, mockGitWatcher);
    });

    it('hideExcludedDirectories が有効な場合 .gitignore に基づきディレクトリが隠れること', async () => {
        // 設定で有効化
        (vscode.workspace.getConfiguration as any).mockReturnValue({
            get: vi.fn((key, def) => {
                if (key === 'exclude') return ['node_modules'];
                if (key === 'excludePatterns') return [];
                if (key === 'hideExcludedDirectories') return true;
                return def;
            })
        });

        // .gitignore を返すようモック
        mockFileSystem.readFile = vi.fn().mockResolvedValue({ isFailure: false, value: '.vscode-test/\n' });

        mockFileSystem.readDirectory.mockResolvedValue(ok([
            ['.vscode-test', 2],
            ['src', 2]
        ]));

        // 新しいプロバイダを生成（コンストラクタで設定を読み込む）
        provider = new FileTreeProvider(mockRoot, selection, mockFileSystem, mockGitWatcher);

        // augmentWithGitignore は非同期で _onDidChangeTreeData.fire() を呼ぶため少し待つ
        await new Promise(r => setTimeout(r, 0));

        const children = await provider.getChildren();
        const labels = children.map(c => c.label);

        expect(labels).not.toContain('.vscode-test');
        expect(labels).toContain('src');
    });

    it('getChildren: 除外パターンに一致するファイルがフィルタリングされること', async () => {
        mockFileSystem.readDirectory.mockResolvedValue(ok([
            ['src', 2],
            ['node_modules', 2],
            ['test.tmp', 1],
            ['app.ts', 1]
        ]));

        const children = await provider.getChildren();
        const labels = children.map(c => c.label);

        expect(labels).toContain('src');
        expect(labels).toContain('app.ts');
        expect(labels).not.toContain('node_modules');
        expect(labels).not.toContain('test.tmp');
    });

    it('refresh: 設定変更後に refresh を呼ぶと除外パターンが更新されること', async () => {
        vi.useFakeTimers();
        (vscode.workspace.getConfiguration as any).mockReturnValue({
            get: vi.fn((key, def) => (key === 'exclude' ? ['src'] : def))
        });

        provider.refresh();
        vi.advanceTimersByTime(1000);
        await vi.runAllTimersAsync();

        mockFileSystem.readDirectory.mockResolvedValue(ok([
            ['src', 2],
            ['node_modules', 2]
        ]));

        const children = await provider.getChildren();
        const labels = children.map(c => c.label);

        expect(labels).toContain('node_modules');
        expect(labels).not.toContain('src');
        vi.useRealTimers();
    });

    it('refresh: 複数の呼び出しが1秒後に1回だけ fire されること', async () => {
        vi.useFakeTimers();
        const fireSpy = vi.spyOn((provider as any)._onDidChangeTreeData, 'fire');

        provider.refresh();
        provider.refresh();
        provider.refresh();

        expect(fireSpy).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1000);
        await vi.runAllTimersAsync();

        expect(fireSpy).toHaveBeenCalledTimes(1);
        vi.useRealTimers();
    });
});


/*
 * Copyright 2026 CodePrep Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { FileTreeProvider } from '../FileTreeProvider';
import { Selection } from '../../selection/domain/Selection';

vi.mock('vscode', () => {
    class MockTreeItem {
        constructor(public label: string, public collapsibleState: any) {}
        public checkboxState: any;
        public resourceUri: any;
        public contextValue: string = '';
        public iconPath: any;
    }
    class MockRelativePattern {
        constructor(public base: any, public pattern: string) {}
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
            fs: { readDirectory: vi.fn() },
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
    const mockRoot = '/root';

    beforeEach(() => {
        vi.clearAllMocks();
        selection = new Selection();
        (vscode.workspace.getConfiguration as any).mockReturnValue({
            get: vi.fn((key, def) => {
                if (key === 'exclude') return ['node_modules'];
                if (key === 'excludePatterns') return ['\\.tmp$'];
                return def;
            })
        });
        provider = new FileTreeProvider(mockRoot, selection);
    });

    it('getChildren: 除外パターンに一致するファイルがフィルタリングされること', async () => {
        (vscode.workspace.fs.readDirectory as any).mockResolvedValue([
            ['src', 2],
            ['node_modules', 2],
            ['test.tmp', 1],
            ['app.ts', 1]
        ]);

        const children = await provider.getChildren();
        const labels = children.map(c => c.label);

        expect(labels).toContain('src');
        expect(labels).toContain('app.ts');
        expect(labels).not.toContain('node_modules');
        expect(labels).not.toContain('test.tmp');
    });

    it('refresh: 設定変更後に refresh を呼ぶと除外パターンが更新されること', async () => {
        // 設定を変更（src を除外対象にする）
        (vscode.workspace.getConfiguration as any).mockReturnValue({
            get: vi.fn((key, def) => (key === 'exclude' ? ['src'] : def))
        });

        provider.refresh();

        (vscode.workspace.fs.readDirectory as any).mockResolvedValue([
            ['src', 2],
            ['node_modules', 2]
        ]);

        const children = await provider.getChildren();
        const labels = children.map(c => c.label);

        expect(labels).toContain('node_modules');
        expect(labels).not.toContain('src');
    });
});


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
import { FileTreeProvider } from '../../../providers/FileTreeProvider';
import { SelectionService } from '../../../services/SelectionService';
import { FileNode } from '../../../models/FileNode';

vi.mock('vscode', () => {
    class MockTreeItem {
        constructor(public label: string, public collapsibleState: any) {}
        public checkboxState: any;
    }
    class MockRelativePattern {
        constructor(public base: any, public pattern: string) {}
    }
    return {
        TreeItem: MockTreeItem,
        TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
        TreeItemCheckboxState: { Unchecked: 0, Checked: 1 },
        RelativePattern: MockRelativePattern,
        EventEmitter: class {
            event = vi.fn();
            fire = vi.fn();
        },
        Uri: { file: vi.fn((p) => ({ fsPath: p })) },
        workspace: {
            fs: { readDirectory: vi.fn() },
            createFileSystemWatcher: vi.fn(() => ({
                onDidCreate: vi.fn(),
                onDidChange: vi.fn(),
                onDidDelete: vi.fn(),
                dispose: vi.fn()
            })),
            getConfiguration: vi.fn(() => ({
                get: vi.fn((key) => {
                    if (key === 'exclude') return [];
                    if (key === 'autoRefreshTree') return true;
                    return undefined;
                })
            }))
        }
    };
});

describe('FileTreeProvider', () => {
    let provider: FileTreeProvider;
    let selectionService: SelectionService;

    beforeEach(() => {
        const mockMemento = { get: vi.fn(), update: vi.fn() } as any;
        selectionService = new SelectionService(mockMemento);
        provider = new FileTreeProvider('/root', selectionService);
    });

    it('should be defined', () => {
        expect(provider).toBeDefined();
    });
});

import * as vscode from 'vscode';
import * as path from 'path';
import { FileNode } from './models/FileNode';
import { Selection } from '../selection/domain/Selection';
import { getRelativePath, normalizePath } from '../../utils/path';

export class FileTreeProvider implements vscode.TreeDataProvider<FileNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<FileNode | undefined | void> = new vscode.EventEmitter<FileNode | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<FileNode | undefined | void> = this._onDidChangeTreeData.event;
    private watcher: vscode.FileSystemWatcher | undefined;
    private workspaceRoot: string | undefined;
    private expandAll: boolean = false;

    constructor(
        workspaceRoot: string | undefined,
        private readonly selection: Selection
    ) {
        this.workspaceRoot = workspaceRoot ? normalizePath(workspaceRoot) : undefined;
        this.updateWatcher();
    }

    /**
     * ワークスペースルートを更新します。
     */
    public setRoot(root: string | undefined): void {
        this.workspaceRoot = root ? normalizePath(root) : undefined;
        this.updateWatcher();
        this.refresh();
    }

    /**
     * 設定に基づき、FileSystemWatcher の状態を更新します。
     */
    public updateWatcher(): void {
        const config = vscode.workspace.getConfiguration('codeprep');
        const autoRefresh = config.get<boolean>('autoRefreshTree', true);

        if (this.watcher) {
            this.watcher.dispose();
            this.watcher = undefined;
        }

        if (autoRefresh && this.workspaceRoot) {
            this.watcher = vscode.workspace.createFileSystemWatcher(
                new vscode.RelativePattern(this.workspaceRoot, '**/*')
            );

            this.watcher.onDidCreate(() => this.refresh());
            this.watcher.onDidChange(() => this.refresh());
            this.watcher.onDidDelete(() => this.refresh());
        }
    }

    refresh(element?: FileNode): void {
        this._onDidChangeTreeData.fire(element);
    }

    public setExpandAll(expand: boolean): void {
        this.expandAll = expand;
        this.refresh();
    }

    getTreeItem(element: FileNode): vscode.TreeItem {
        let collapsibleState = vscode.TreeItemCollapsibleState.None;
        if (element.isDirectory) {
            collapsibleState = this.expandAll 
                ? vscode.TreeItemCollapsibleState.Expanded 
                : vscode.TreeItemCollapsibleState.Collapsed;
        }

        const treeItem = new vscode.TreeItem(
            element.label,
            collapsibleState
        );

        treeItem.resourceUri = element.uri;
        treeItem.contextValue = element.isDirectory ? 'directory' : 'file';
        
        const isSelected = this.selection.has(normalizePath(element.relativePath));
        treeItem.checkboxState = isSelected ? vscode.TreeItemCheckboxState.Checked : vscode.TreeItemCheckboxState.Unchecked;
        
        treeItem.iconPath = element.isDirectory ? new vscode.ThemeIcon('folder') : new vscode.ThemeIcon('file');

        return treeItem;
    }

    async getChildren(element?: FileNode): Promise<FileNode[]> {
        if (!this.workspaceRoot) {
            return [];
        }

        const folderPath = element ? element.fullPath : this.workspaceRoot;
        try {
            const children = await vscode.workspace.fs.readDirectory(vscode.Uri.file(folderPath));
            
            const config = vscode.workspace.getConfiguration('codeprep');
            
            // Legacy exclude (simple string match)
            const excludePatterns: string[] = config.get('exclude') || [];
            const preparedPatterns = excludePatterns.map(p => p.replace(/\\/g, '/').split('/').filter(s => s !== '**' && s !== ''));

            // New regex-based exclude patterns
            const regexPatterns: string[] = config.get('excludePatterns') || [];
            const compiledRegexes: RegExp[] = [];

            for (const pattern of regexPatterns) {
                try {
                    compiledRegexes.push(new RegExp(pattern));
                } catch (e) {
                    console.error(`CodePrep: Invalid regex pattern: \${pattern}`, e);
                }
            }

            const nodes: FileNode[] = [];
            for (const [name, type] of children) {
                const fullPath = path.join(folderPath, name);
                const relativePath = normalizePath(getRelativePath(this.workspaceRoot, fullPath));

                // 1. Legacy check
                if (this.isExcludedOptimized(relativePath, preparedPatterns)) {
                    continue;
                }

                // 2. Regex check
                if (this.isExcludedByRegex(relativePath, compiledRegexes)) {
                    continue;
                }

                nodes.push(new FileNode(
                    name,
                    fullPath,
                    relativePath,
                    type === vscode.FileType.Directory
                ));
            }

            return nodes.sort((a, b) => {
                if (a.isDirectory === b.isDirectory) {
                    return a.label.localeCompare(b.label);
                }
                return a.isDirectory ? -1 : 1;
            });
        } catch (_error) {
            console.error(`CodePrep: Legacy Regex check`, _error);
            return [];
        }
    }

    private isExcludedOptimized(normalizedPath: string, preparedPatterns: string[][]): boolean {
        const pathParts = normalizedPath.split('/');

        return preparedPatterns.some(segments => {
            return segments.some(seg => pathParts.includes(seg));
        });
    }

    private isExcludedByRegex(normalizedPath: string, regexes: RegExp[]): boolean {
        return regexes.some(regex => regex.test(normalizedPath));
    }

    public dispose(): void {
        if (this.watcher) {
            this.watcher.dispose();
        }
    }
}

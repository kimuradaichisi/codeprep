import * as vscode from 'vscode';
import * as path from 'path';
import { FileNode } from './models/FileNode';
import { Selection } from '../selection/domain/Selection';
import { getRelativePath, normalizePath } from '../../utils/path';
import { GitWatcher } from '../selection/infrastructure/GitWatcher';

export class FileTreeProvider implements vscode.TreeDataProvider<FileNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<FileNode | undefined | void> = new vscode.EventEmitter<FileNode | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<FileNode | undefined | void> = this._onDidChangeTreeData.event;
    private watcher: vscode.FileSystemWatcher | undefined;
    private workspaceRoot: string | undefined;
    private expandAll: boolean = false;
    private compiledExcludes: RegExp[] = [];

    constructor(
        workspaceRoot: string | undefined,
        private readonly selection: Selection,
        private readonly gitWatcher?: GitWatcher
    ) {
        this.workspaceRoot = workspaceRoot ? normalizePath(workspaceRoot) : undefined;
        this.loadConfiguration();
        this.updateWatcher();
    }

    private loadConfiguration(): void {
        const config = vscode.workspace.getConfiguration('codeprep');
        const excludes: string[] = config.get('exclude', []);
        const regexPatterns: string[] = config.get('excludePatterns', []);

        this.compiledExcludes = [
            ...excludes.map(p => this.convertToRegex(p)),
            ...regexPatterns.map(p => new RegExp(p))
        ];
    }

    private convertToRegex(pattern: string): RegExp {
        const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '[^/]*')
            .replace(/\//g, '[\\\\/]');
        return new RegExp(`(^|[\\\\/])${escaped}([\\\\/]|$)`);
    }

    public setRoot(root: string | undefined): void {
        this.workspaceRoot = root ? normalizePath(root) : undefined;
        this.updateWatcher();
        this.refresh();
    }

    public updateWatcher(): void {
        const config = vscode.workspace.getConfiguration('codeprep');
        if (this.watcher) {
            this.watcher.dispose();
            this.watcher = undefined;
        }

        if (config.get<boolean>('autoRefreshTree', true) && this.workspaceRoot) {
            this.watcher = vscode.workspace.createFileSystemWatcher(
                new vscode.RelativePattern(this.workspaceRoot, '**/*')
            );
            this.watcher.onDidCreate(() => this.refresh());
            this.watcher.onDidChange(() => this.refresh());
            this.watcher.onDidDelete(() => this.refresh());
        }
    }

    refresh(element?: FileNode): void {
        this.loadConfiguration();
        this._onDidChangeTreeData.fire(element);
    }

    public setExpandAll(expand: boolean): void {
        this.expandAll = expand;
        this.refresh();
    }

    getTreeItem(element: FileNode): vscode.TreeItem {
        const collapsible = element.isDirectory
            ? (this.expandAll ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed)
            : vscode.TreeItemCollapsibleState.None;

        const item = new vscode.TreeItem(element.label, collapsible);
        item.resourceUri = element.uri;
        item.contextValue = element.isDirectory ? 'directory' : 'file';
        
        const isSelected = this.selection.has(normalizePath(element.relativePath));
        item.checkboxState = isSelected ? vscode.TreeItemCheckboxState.Checked : vscode.TreeItemCheckboxState.Unchecked;
        
        this.applyIcon(item, element);

        return item;
    }

    private applyIcon(item: vscode.TreeItem, element: FileNode): void {
        if (element.isDirectory) {
            item.iconPath = new vscode.ThemeIcon('folder');
            return;
        }

        if (this.gitWatcher?.isModified(element.relativePath)) {
            item.iconPath = new vscode.ThemeIcon('git-commit', new vscode.ThemeColor('gitDecoration.modifiedResourceForeground'));
            return;
        }

        item.iconPath = new vscode.ThemeIcon('file');
    }

    async getChildren(element?: FileNode): Promise<FileNode[]> {
        if (!this.workspaceRoot) return [];
        const folderPath = element ? element.fullPath : this.workspaceRoot;
        try {
            const children = await vscode.workspace.fs.readDirectory(vscode.Uri.file(folderPath));
            const nodes: FileNode[] = [];
            
            for (const [name, type] of children) {
                const fullPath = path.join(folderPath, name);
                const relPath = normalizePath(getRelativePath(this.workspaceRoot, fullPath));
                if (this.isExcluded(relPath)) continue;

                nodes.push(new FileNode(name, fullPath, relPath, type === vscode.FileType.Directory));
            }
            return nodes.sort((a, b) => a.isDirectory === b.isDirectory ? a.label.localeCompare(b.label) : (a.isDirectory ? -1 : 1));
        } catch { return []; }
    }

    private isExcluded(relPath: string): boolean {
        return this.compiledExcludes.some(re => re.test(relPath));
    }

    public dispose(): void {
        this.watcher?.dispose();
    }
}

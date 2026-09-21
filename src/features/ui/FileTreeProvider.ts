import * as vscode from 'vscode';
import * as path from 'path';
import { FileNode } from './models/FileNode';
import { Selection } from '../selection/domain/Selection';
import { normalizePath } from '../../utils/path';
import { GitWatcher } from '../selection/infrastructure/GitWatcher';
import { FileIconService } from './domain/FileIconService';
import { FileIconType } from './domain/FileIconType';
import { IFileSystem } from '../../shared/domain/IFileSystem';
import { TreeConfigLoader, TreeConfig } from './TreeConfigLoader';
import { DirectoryCache } from './domain/DirectoryCache';

export interface FileTreeOptions {
    gitWatcher?: GitWatcher;
    rootUri?: vscode.Uri;
}

export class FileTreeProvider implements vscode.TreeDataProvider<FileNode> {
    private _onDidChangeTreeData = new vscode.EventEmitter<FileNode | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    private watcher: vscode.FileSystemWatcher | undefined;
    private workspaceRoot: string | undefined;
    private expandAll = false;
    private config: TreeConfig = { excludePatterns: [], excludedDirNames: new Set(), hideExcludedDirectories: false, useGitignore: true };
    private readonly iconService = new FileIconService();
    private readonly configLoader: TreeConfigLoader;
    private readonly directoryCache = new DirectoryCache();
    private refreshTimer: NodeJS.Timeout | undefined;
    private readonly gitWatcher?: GitWatcher;
    private rootUri?: vscode.Uri;
    private treeView?: vscode.TreeView<FileNode>;
    private loading = false;

    constructor(
        workspaceRoot: string | undefined,
        private readonly selection: Selection,
        private readonly fileSystem: IFileSystem,
        optionsOrWatcher?: FileTreeOptions | GitWatcher
    ) {
        this.workspaceRoot = workspaceRoot ? normalizePath(workspaceRoot) : undefined;
        if (optionsOrWatcher && 'updateCache' in optionsOrWatcher) {
            this.gitWatcher = optionsOrWatcher;
        } else if (optionsOrWatcher) {
            this.gitWatcher = optionsOrWatcher.gitWatcher;
            this.rootUri = optionsOrWatcher.rootUri;
        }
        this.configLoader = new TreeConfigLoader(fileSystem, () => this._onDidChangeTreeData.fire());
        this.reloadConfig();
        this.updateWatcher();
    }

    public bindTreeView(treeView: vscode.TreeView<FileNode>): void {
        this.treeView = treeView;
    }

    public get isLoading(): boolean {
        return this.loading;
    }

    private reloadConfig(): void {
        this.config = this.configLoader.load(this.workspaceRoot);
    }

    public setRoot(root: string | undefined, rootUri?: vscode.Uri): void {
        this.workspaceRoot = root ? normalizePath(root) : undefined;
        this.rootUri = rootUri;
        this.updateWatcher();
        this.refreshImmediate();
    }

    public refresh(element?: FileNode, immediate = false): void {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = undefined;
        }
        if (immediate) {
            this.executeRefresh(element);
            return;
        }
        this.refreshTimer = setTimeout(() => {
            this.executeRefresh(element);
        }, 1000);
    }

    public refreshImmediate(element?: FileNode): void {
        this.refresh(element, true);
    }

    private executeRefresh(element?: FileNode): void {
        this.directoryCache.clear(element?.fullPath);
        this.reloadConfig();
        this._onDidChangeTreeData.fire(element);
    }

    public updateWatcher(): void {
        const config = vscode.workspace.getConfiguration('codeprep');
        this.watcher?.dispose();
        this.watcher = undefined;
        const base = this.rootUri ?? this.workspaceRoot;
        if (config.get<boolean>('autoRefreshTree', true) && base) {
            this.watcher = vscode.workspace.createFileSystemWatcher(
                new vscode.RelativePattern(base, '**/*')
            );
            const trigger = () => {
                this.directoryCache.clear();
                this.refresh();
            };
            this.watcher.onDidCreate(trigger);
            this.watcher.onDidChange(trigger);
            this.watcher.onDidDelete(trigger);
        }
    }

    public setExpandAll(expand: boolean): void {
        this.expandAll = expand;
        this.refreshImmediate();
    }

    getTreeItem(element: FileNode): vscode.TreeItem {
        if (element.isLoading) {
            return this.createLoadingTreeItem(element);
        }
        const collapsible = element.isDirectory
            ? (this.expandAll ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed)
            : vscode.TreeItemCollapsibleState.None;
        const item = new vscode.TreeItem(element.label, collapsible);
        item.resourceUri = element.uri;
        item.contextValue = element.isDirectory ? 'directory' : 'file';
        if (!element.isDirectory) {
            item.command = { command: 'vscode.open', title: 'Open File', arguments: [element.uri] };
        }
        item.checkboxState = this.selection.has(normalizePath(element.relativePath))
            ? vscode.TreeItemCheckboxState.Checked
            : vscode.TreeItemCheckboxState.Unchecked;
        this.applyIcon(item, element);
        return item;
    }

    private createLoadingTreeItem(element: FileNode): vscode.TreeItem {
        const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
        item.iconPath = new vscode.ThemeIcon('loading~spin');
        item.contextValue = 'loading';
        return item;
    }

    private applyIcon(item: vscode.TreeItem, element: FileNode): void {
        const isModified = !!this.gitWatcher?.isModified(element.relativePath);
        const iconType = this.iconService.getIconType(element.isDirectory, isModified);
        item.iconPath = iconType === FileIconType.ModifiedFile
            ? new vscode.ThemeIcon(iconType, new vscode.ThemeColor('gitDecoration.modifiedResourceForeground'))
            : new vscode.ThemeIcon(iconType);
    }

    async getChildren(element?: FileNode): Promise<FileNode[]> {
        if (!this.workspaceRoot) return [];
        if (element?.isLoading) return [];
        if (!element) {
            return this.loadRootChildren();
        }
        return this.loadFolderChildren(element);
    }

    private async loadRootChildren(): Promise<FileNode[]> {
        this.setLoadingState(true);
        try {
            return await this.withOptionalProgress(() => this.fetchAndSortNodes(this.workspaceRoot!));
        } finally {
            this.setLoadingState(false);
        }
    }

    private async loadFolderChildren(element: FileNode): Promise<FileNode[]> {
        return this.fetchAndSortNodes(element.fullPath, element);
    }

    private setLoadingState(loading: boolean): void {
        this.loading = loading;
        if (this.treeView) {
            this.treeView.message = loading ? '読み込み中...' : undefined;
        }
    }

    private async withOptionalProgress<T>(task: () => Promise<T>): Promise<T> {
        if (vscode.window?.withProgress) {
            return vscode.window.withProgress(
                { location: { viewId: 'codeprep.fileTree' } },
                async () => task()
            );
        }
        return task();
    }

    private async fetchAndSortNodes(folderPath: string, parent?: FileNode): Promise<FileNode[]> {
        const nodes = await this.fetchNodes(folderPath, parent);
        return nodes.sort((a, b) => this.compareNodes(a, b));
    }

    private async fetchNodes(folderPath: string, parent?: FileNode): Promise<FileNode[]> {
        const entries = await this.readDirectoryCached(folderPath);
        if (!entries) return [];
        const nodes: FileNode[] = [];
        for (const [name, isDir] of entries) {
            const node = this.createNodeIfIncluded(folderPath, name, isDir, parent);
            if (node) nodes.push(node);
        }
        return nodes;
    }

    private async readDirectoryCached(folderPath: string): Promise<[string, boolean][] | undefined> {
        const cached = this.directoryCache.get(folderPath);
        if (cached) return cached;
        const result = await this.fileSystem.readDirectory(folderPath);
        if (result.isFailure) return undefined;
        this.directoryCache.set(folderPath, result.value);
        return result.value;
    }

    private createNodeIfIncluded(folderPath: string, name: string, isDir: boolean, parent?: FileNode): FileNode | null {
        if (this.isExcludedDirectory(name, isDir)) return null;
        const relPath = this.buildRelativePath(name, parent);
        if (this.isExcludedByPattern(relPath)) return null;
        const fullPath = this.buildFullPath(folderPath, name, parent);
        const nodeUri = this.resolveNodeUri(fullPath, relPath);
        return new FileNode({ label: name, fullPath, relativePath: relPath, isDirectory: isDir, uri: nodeUri });
    }

    private isExcludedDirectory(name: string, isDir: boolean): boolean {
        if (!isDir) return false;
        if (this.config.hideExcludedDirectories && this.config.excludedDirNames.has(name)) return true;
        return false;
    }

    private isExcludedByPattern(relPath: string): boolean {
        return this.config.excludePatterns.some(p => p.match(relPath));
    }

    private buildRelativePath(name: string, parent?: FileNode): string {
        if (parent?.relativePath) {
            return `${parent.relativePath}/${name}`;
        }
        return normalizePath(name);
    }

    private buildFullPath(folderPath: string, name: string, parent?: FileNode): string {
        if (parent?.fullPath) {
            return parent.fullPath.includes('\\') ? `${parent.fullPath}\\${name}` : `${parent.fullPath}/${name}`;
        }
        return path.join(folderPath, name);
    }

    private resolveNodeUri(fullPath: string, relPath: string): vscode.Uri {
        if (this.rootUri) {
            return vscode.Uri.joinPath(this.rootUri, relPath);
        }
        return vscode.Uri.file(fullPath);
    }

    private compareNodes(a: FileNode, b: FileNode): number {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return a.label.localeCompare(b.label);
    }

    public dispose(): void {
        this.watcher?.dispose();
    }
}

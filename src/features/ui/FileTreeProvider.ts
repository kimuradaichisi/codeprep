import * as vscode from 'vscode';
import * as path from 'path';
import { FileNode } from './models/FileNode';
import { Selection } from '../selection/domain/Selection';
import { getRelativePath, normalizePath } from '../../utils/path';
import { GitWatcher } from '../selection/infrastructure/GitWatcher';
import { FileIconService } from './domain/FileIconService';
import { FileIconType } from './domain/FileIconType';
import { IFileSystem } from '../../shared/domain/IFileSystem';
import { TreeConfigLoader, TreeConfig } from './TreeConfigLoader';

export class FileTreeProvider implements vscode.TreeDataProvider<FileNode> {
    private _onDidChangeTreeData = new vscode.EventEmitter<FileNode | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    private watcher: vscode.FileSystemWatcher | undefined;
    private workspaceRoot: string | undefined;
    private expandAll = false;
    private config: TreeConfig = { excludePatterns: [], excludedDirNames: new Set(), hideExcludedDirectories: false };
    private readonly iconService = new FileIconService();
    private readonly configLoader: TreeConfigLoader;
    private refreshTimer: NodeJS.Timeout | undefined;

    constructor(
        workspaceRoot: string | undefined,
        private readonly selection: Selection,
        private readonly fileSystem: IFileSystem,
        private readonly gitWatcher?: GitWatcher
    ) {
        this.workspaceRoot = workspaceRoot ? normalizePath(workspaceRoot) : undefined;
        this.configLoader = new TreeConfigLoader(fileSystem, () => this._onDidChangeTreeData.fire());
        this.reloadConfig();
        this.updateWatcher();
    }

    private reloadConfig(): void {
        this.config = this.configLoader.load(this.workspaceRoot);
    }

    public setRoot(root: string | undefined): void {
        this.workspaceRoot = root ? normalizePath(root) : undefined;
        this.updateWatcher();
        this.refresh();
    }

    refresh(element?: FileNode): void {
        if (this.refreshTimer) clearTimeout(this.refreshTimer);
        this.refreshTimer = setTimeout(() => {
            this.reloadConfig();
            this._onDidChangeTreeData.fire(element);
        }, 1000);
    }

    public updateWatcher(): void {
        const config = vscode.workspace.getConfiguration('codeprep');
        this.watcher?.dispose();
        this.watcher = undefined;
        if (config.get<boolean>('autoRefreshTree', true) && this.workspaceRoot) {
            this.watcher = vscode.workspace.createFileSystemWatcher(
                new vscode.RelativePattern(this.workspaceRoot, '**/*')
            );
            const trigger = () => this.refresh();
            this.watcher.onDidCreate(trigger);
            this.watcher.onDidChange(trigger);
            this.watcher.onDidDelete(trigger);
        }
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
        if (!element.isDirectory) {
            item.command = { command: 'vscode.open', title: 'Open File', arguments: [element.uri] };
        }
        item.checkboxState = this.selection.has(normalizePath(element.relativePath))
            ? vscode.TreeItemCheckboxState.Checked
            : vscode.TreeItemCheckboxState.Unchecked;
        this.applyIcon(item, element);
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
        const folderPath = element ? element.fullPath : this.workspaceRoot;
        const nodes = await this.fetchNodes(folderPath);
        return nodes.sort((a, b) => this.compareNodes(a, b));
    }

    private async fetchNodes(folderPath: string): Promise<FileNode[]> {
        const result = await this.fileSystem.readDirectory(folderPath);
        if (result.isFailure) return [];
        const nodes: FileNode[] = [];
        for (const [name, isDir] of result.value) {
            const node = this.createNodeIfIncluded(folderPath, name, isDir);
            if (node) nodes.push(node);
        }
        return nodes;
    }

    private createNodeIfIncluded(folderPath: string, name: string, isDir: boolean): FileNode | null {
        const fullPath = path.join(folderPath, name);
        const relPath = normalizePath(getRelativePath(this.workspaceRoot!, fullPath));
        if (this.config.excludePatterns.some(p => p.match(relPath))) return null;
        if (this.config.hideExcludedDirectories && isDir && this.config.excludedDirNames.has(name)) return null;
        return new FileNode(name, fullPath, relPath, isDir);
    }

    private compareNodes(a: FileNode, b: FileNode): number {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return a.label.localeCompare(b.label);
    }

    public dispose(): void {
        this.watcher?.dispose();
    }
}

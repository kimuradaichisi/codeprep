import * as vscode from 'vscode';
import * as path from 'path';
import { FileNode } from './models/FileNode';
import { Selection } from '../selection/domain/Selection';
import { getRelativePath, normalizePath } from '../../utils/path';
import { GitWatcher } from '../selection/infrastructure/GitWatcher';
import { ExcludePattern } from './domain/ExcludePattern';
import { FileIconService } from './domain/FileIconService';
import { FileIconType } from './domain/FileIconType';
import { IFileSystem } from '../../shared/domain/IFileSystem';

export class FileTreeProvider implements vscode.TreeDataProvider<FileNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<FileNode | undefined | void> = new vscode.EventEmitter<FileNode | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<FileNode | undefined | void> = this._onDidChangeTreeData.event;
    private watcher: vscode.FileSystemWatcher | undefined;
    private workspaceRoot: string | undefined;
    private expandAll: boolean = false;
    private excludePatterns: ExcludePattern[] = [];
    private readonly iconService = new FileIconService();

    constructor(
        workspaceRoot: string | undefined,
        private readonly selection: Selection,
        private readonly fileSystem: IFileSystem,
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
        const newPatterns = [
            ...excludes.map(p => ExcludePattern.create(p)),
            ...regexPatterns.map(p => ExcludePattern.createFromRegex(p))
        ];
        // 簡易的な比較（文字列表現等）で更新要否を判定しても良いが、ここでは代入のみ
        this.excludePatterns = newPatterns;
    }

    public setRoot(root: string | undefined): void {
        this.workspaceRoot = root ? normalizePath(root) : undefined;
        this.updateWatcher();
        this.refresh();
    }

    private refreshTimer: NodeJS.Timeout | undefined;

    refresh(element?: FileNode): void {
        if (this.refreshTimer) clearTimeout(this.refreshTimer);
        this.refreshTimer = setTimeout(() => {
            this.loadConfiguration();
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
            this.registerWatcherEvents(this.watcher);
        }
    }

    private registerWatcherEvents(watcher: vscode.FileSystemWatcher): void {
        const trigger = () => this.refresh();
        watcher.onDidCreate(trigger);
        watcher.onDidChange(trigger);
        watcher.onDidDelete(trigger);
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
        const isModified = !!this.gitWatcher?.isModified(element.relativePath);
        const iconType = this.iconService.getIconType(element.isDirectory, isModified);
        if (iconType === FileIconType.ModifiedFile) {
            item.iconPath = new vscode.ThemeIcon(iconType, new vscode.ThemeColor('gitDecoration.modifiedResourceForeground'));
        } else {
            item.iconPath = new vscode.ThemeIcon(iconType);
        }
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
        if (this.excludePatterns.some(p => p.match(relPath))) return null;
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
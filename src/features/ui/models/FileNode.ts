import * as vscode from 'vscode';

export class FileNode {
    public readonly uri: vscode.Uri;
    constructor(
        public readonly label: string,
        public readonly fullPath: string,
        public readonly relativePath: string,
        public readonly isDirectory: boolean
    ) {
        this.uri = vscode.Uri.file(fullPath);
    }
}
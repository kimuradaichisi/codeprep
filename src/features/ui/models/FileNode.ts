import * as vscode from 'vscode';

export interface FileNodeProps {
    label: string;
    fullPath: string;
    relativePath: string;
    isDirectory: boolean;
    uri?: vscode.Uri;
}

export class FileNode {
    public readonly label: string;
    public readonly fullPath: string;
    public readonly relativePath: string;
    public readonly isDirectory: boolean;
    public readonly uri: vscode.Uri;

    constructor(props: FileNodeProps) {
        this.label = props.label;
        this.fullPath = props.fullPath;
        this.relativePath = props.relativePath;
        this.isDirectory = props.isDirectory;
        this.uri = props.uri ?? vscode.Uri.file(props.fullPath);
    }
}

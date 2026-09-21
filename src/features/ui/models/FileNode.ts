import * as vscode from 'vscode';

export interface FileNodeProps {
    label: string;
    fullPath: string;
    relativePath: string;
    isDirectory: boolean;
    uri?: vscode.Uri;
    isLoading?: boolean;
}

export class FileNode {
    public readonly label: string;
    public readonly fullPath: string;
    public readonly relativePath: string;
    public readonly isDirectory: boolean;
    public readonly uri: vscode.Uri;
    public readonly isLoading: boolean;

    constructor(props: FileNodeProps) {
        this.label = props.label;
        this.fullPath = props.fullPath;
        this.relativePath = props.relativePath;
        this.isDirectory = props.isDirectory;
        this.uri = props.uri ?? vscode.Uri.file(props.fullPath);
        this.isLoading = props.isLoading ?? false;
    }

    public static createLoadingNode(label = 'Loading...'): FileNode {
        return new FileNode({
            label,
            fullPath: '__loading__',
            relativePath: '__loading__',
            isDirectory: false,
            isLoading: true
        });
    }
}

# MS_5_TREE_PROVIDER Design Specification

## 1. FileTreeProvider
VS Codeの `TreeDataProvider` を実装し、ワークスペースのファイル構造をチェックボックス付きで表示する。

### 1.1. 主な責務
- ワークスペース内のファイル/ディレクトリの走査。
- `SelectionService` と連携したチェック状態の管理。
- `codeprep.exclude` 設定に基づいたフィルタリング。

### 1.2. 構造定義
```typescript
class FileTreeProvider implements vscode.TreeDataProvider<FileNode> {
    constructor(
        private workspaceRoot: string,
        private selectionService: SelectionService
    ) {}

    /** ツリーアイテムの取得（チェックボックスの状態を設定） */
    getTreeItem(element: FileNode): vscode.TreeItem;

    /** 子ノードの取得（再帰的にディレクトリをスキャン） */
    getChildren(element?: FileNode): Thenable<FileNode[]>;

    /** 除外パターンの適用 */
    private isExcluded(path: string): boolean;
}
```

### 1.3. TreeItem の挙動
- **Checkbox**: `vscode.TreeItemCheckboxState` を使用。
- **ContextValue**: ディレクトリとファイルを区別し、右クリックメニューなどを制御。
- **CollapsibleState**: ディレクトリは `Collapsed`、ファイルは `None`。

### 1.4. イベント連携
- チェックボックスが操作された際、`SelectionService.setSelection()` を呼び出し、ツリーをリフレッシュする。
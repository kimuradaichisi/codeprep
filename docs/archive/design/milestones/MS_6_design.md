# MS_6_EXTENSION_ENTRY Design Specification

## 1. Extension Lifecycle (extension.ts)
拡張機能の起動時にすべてのコンポーネントを初期化し、VS Code のコンテキストに登録する。

### 1.1. 初期化フロー
1. `SelectionService` を `context.workspaceState` で初期化。
2. `CommandService` をインスタンス化。
3. `FileTreeProvider` をインスタンス化（`workspaceRoot` と `SelectionService` を注入）。
4. `vscode.window.createTreeView` でツリービューを作成。

### 1.2. コマンド登録
- **codeprep.generate**:
  - `SelectionService.getSelection()` からパスを取得。
  - `CommandService.execute(paths)` を呼び出し。
- **codeprep.selectAll / clearAll**:
  - `SelectionService` の状態を一括更新。
  - `FileTreeProvider.refresh()` を実行。
- **codeprep.refreshTree**:
  - `FileTreeProvider.refresh()` を実行。

### 1.3. イベントハンドリング
- **onDidChangeCheckboxState**:
  - チェックされたアイテムのリストを受け取り、`SelectionService` を一括更新。
  - 内部状態の整合性を維持。
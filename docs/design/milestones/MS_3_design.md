# MS_3_SELECTION_SERVICE Design Specification

## 1. SelectionService
ユーザーが選択したファイルパスの集合を管理し、`vscode.Memento` を通じて永続化する責務を持つ。

### 1.1. 核心ロジック
- 内部的には `Set<string>` を使用して、選択された相対パスを保持する。
- 変更が発生するたびに `workspaceState` へ同期する。

### 1.2. インターフェース定義
```typescript
class SelectionService {
    constructor(private storage: vscode.Memento) {}

    /** 現在選択されているすべての相対パスを取得 */
    getSelection(): Set<string>;

    /** パスの選択状態を切り替える */
    setSelection(path: string, checked: boolean): void;

    /** すべての選択を解除する */
    clear(): void;

    /** 指定したパスが選択されているか確認 */
    isSelected(path: string): boolean;
}
```

## 2. Persistence Schema
- **Key**: `codeprep.selectedPaths`
- **Value**: `string[]` (Setを配列に変換して保存)
# MS_4_COMMAND_SERVICE Design Specification

## 1. CommandService
選択されたファイルパスを引数として `codeprep` コマンドを構築し、実行する責務を持つ。

### 1.1. コマンド構築ロジック
- ベースコマンド: `npx codeprep`
- 引数: `--include` オプションを使用。
- パス形式: コンマ区切りの相対パスリスト（引用符で囲む）。
  - 例: `npx codeprep --include "src/main.ts,src/utils.ts"`

### 1.2. インターフェース定義
```typescript
class CommandService {
    /**
     * 指定されたパスリストに対してcodeprepを実行する。
     * @param paths 相対パスの配列
     */
    async execute(paths: string[]): Promise<void>;

    /** ターミナルの取得または作成 */
    private getOrCreateTerminal(): vscode.Terminal;
}
```

### 1.3. VS Code統合
- `vscode.window.terminals` を検索し、名前が "CodePrep" のものを探す。
- 存在しない場合は `vscode.window.createTerminal("CodePrep")` で作成。
- `terminal.sendText(command)` を使用してコマンドを送信。
- 実行前に `terminal.show()` を呼び出し、ユーザーに視認させる。